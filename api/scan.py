from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response
import cv2
import numpy as np

app = FastAPI()

MAX_SIZE = 25 * 1024 * 1024
ALLOWED_CT = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"}

def _border_brightness(gray) -> dict:
    h, w = gray.shape[:2]
    strip = 3
    def frac(side):
        if side == "top": s = gray[0:strip, :]
        elif side == "bottom": s = gray[h-strip:h, :]
        elif side == "left": s = gray[:, 0:strip]
        else: s = gray[:, w-strip:w]
        return float((s > 150).mean())
    return {k: frac(k) for k in ("top","bottom","left","right")}

def _order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def _four_point_transform(image, pts):
    rect = _order_points(pts)
    (tl, tr, br, bl) = rect
    wA = np.sqrt(((br[0]-bl[0])**2)+((br[1]-bl[1])**2))
    wB = np.sqrt(((tr[0]-tl[0])**2)+((tr[1]-tl[1])**2))
    maxW = max(int(wA), int(wB))
    hA = np.sqrt(((tr[0]-br[0])**2)+((tr[1]-br[1])**2))
    hB = np.sqrt(((tl[0]-bl[0])**2)+((tl[1]-bl[1])**2))
    maxH = max(int(hA), int(hB))
    if maxW < 100 or maxH < 100:
        return None
    dst = np.array([[0,0],[maxW-1,0],[maxW-1,maxH-1],[0,maxH-1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, M, (maxW, maxH))

@app.get("/api/scan")
async def health():
    return {"ok": True}

@app.post("/api/scan")
async def scan(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File terlalu besar (maks 25 MB)")
    if len(data) == 0:
        raise HTTPException(status_code=422, detail="File kosong")

    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=422, detail=f'File "{file.filename}" bukan gambar valid / korup — upload ulang foto yang benar')

    # downscale large
    h, w = img.shape[:2]
    max_side = 1800
    if max(h, w) > max_side:
        scale = max_side / max(h, w)
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5,5), 0)
    edged = cv2.Canny(gray, 75, 200)

    # close gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5,5))
    closed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)

    # edge-based contour search (perspective crop)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    screen_cnt = None
    if contours:
        contours_sorted = sorted(contours, key=cv2.contourArea, reverse=True)
        img_area = img.shape[0]*img.shape[1]
        for c in contours_sorted[:5]:
            area = cv2.contourArea(c)
            if area < img_area * 0.15:
                continue
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                screen_cnt = approx
                break

    if screen_cnt is not None:
        pts = screen_cnt.reshape(4, 2).astype("float32")
        warped = _four_point_transform(img, pts)
        if warped is not None:
            ok, buf = cv2.imencode(".jpg", warped, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
            if ok:
                return Response(content=buf.tobytes(), media_type="image/jpeg")

    # No quad found — diagnose border-touching vs low contrast
    bfrac = _border_brightness(gray)
    touched = [k for k,v in bfrac.items() if v > 0.60]
    if touched:
        label = ", ".join(touched)
        raise HTTPException(status_code=422, detail=f'Tepi kertas terpotong bingkai foto (sisi: {label}) pada file "{file.filename}" — mundur sedikit agar seluruh kertas + sedikit background terlihat, lalu foto ulang')

    # Fallback: deskew via minAreaRect (best-effort rotation correction)
    if contours:
        contours_sorted = sorted(contours, key=cv2.contourArea, reverse=True)
        img_area = img.shape[0]*img.shape[1]
        for c in contours_sorted[:3]:
            area = cv2.contourArea(c)
            if area < img_area * 0.10:
                continue
            rect = cv2.minAreaRect(c)
            angle = rect[2]
            # normalize angle so that longer side becomes vertical
            w_r, h_r = rect[1]
            if w_r == 0 or h_r == 0:
                continue
            if w_r > h_r:
                angle = angle + 90
            # normalize to [-45, 45]
            if angle > 45:
                angle -= 90
            elif angle < -45:
                angle += 90
            if abs(angle) < 0.5:
                continue
            center = (img.shape[1]/2, img.shape[0]/2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            deskewed = cv2.warpAffine(img, M, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            ok, buf = cv2.imencode(".jpg", deskewed, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
            if ok:
                return Response(content=buf.tobytes(), media_type="image/jpeg", headers={"X-Scan-Mode": "deskew"})

    raise HTTPException(status_code=422, detail=f'Kertas tidak terdeteksi pada file "{file.filename}" — foto ulang dengan kertas memenuhi frame dan background kontras')
