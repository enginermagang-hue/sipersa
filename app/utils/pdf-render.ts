export const PAPER: Record<string, [number, number]> = {
  a4: [210, 297],
  f4: [210, 330],
  letter: [215.9, 279.4]
}

export interface PdfRenderConfig {
  ukuranKertas?: string
  font?: string
  marginMm?: number
  orientasi?: 'portrait' | 'landscape'
}

export function parseRenderConfig(json: string | null | undefined): Required<PdfRenderConfig> {
  let cfg: PdfRenderConfig = {}
  try {
    if (json) cfg = JSON.parse(json)
  } catch { /* fallback default */ }
  return {
    ukuranKertas: cfg.ukuranKertas || 'a4',
    font: cfg.font || 'Inter',
    marginMm: Number(cfg.marginMm) || 25,
    orientasi: cfg.orientasi === 'landscape' ? 'landscape' : 'portrait'
  }
}

export function renderPdf(html: string, cfg: PdfRenderConfig): Promise<string> {
  return new Promise((resolve, reject) => {
    const [w, h] = PAPER[cfg.ukuranKertas || 'a4'] || PAPER.a4
    const [pw, ph] = cfg.orientasi === 'landscape' ? [Math.max(w, h), Math.min(w, h)] : [w, h]
    const font = cfg.font || 'Inter'
    const marginMm = Number(cfg.marginMm) || 25
    const ifr = document.createElement('iframe')
    ifr.style.cssText = 'position:fixed;top:0;left:-10000px;width:210mm;height:297mm;border:0;visibility:hidden'
    document.body.appendChild(ifr)

    const srcdoc = ['<!DOCTYPE html><html lang="id"><head>',
      '<meta charset="utf-8"/>',
      '<link rel="preconnect" href="https://fonts.googleapis.com"/>',
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>',
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Times+New+Roman&display=swap"/>`,
      '<style>',
      `body{margin:0}#sheet{width:${pw}mm;min-height:${ph}mm;box-sizing:border-box;padding:${marginMm}mm;font-family:${font === 'Inter' ? "'Inter',sans-serif" : `'${font}',serif`};font-size:12pt;line-height:1.6;color:#000;background:#fff}`,
      'img{max-width:100%}</style>',
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>',
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>',
      `<script>window.__imReady=false;window.__render=async function(html){document.getElementById("sheet").innerHTML=html;await document.fonts.ready;var c=await html2canvas(document.getElementById("sheet"),{scale:2,backgroundColor:"#ffffff"});var img=c.toDataURL("image/jpeg",0.98);var pdf=new jspdf.jsPDF({unit:"mm",format:[${pw},${ph}],orientation:"${cfg.orientasi || 'portrait'}"});pdf.addImage(img,"JPEG",0,0,${pw},${ph},undefined,"FAST");window.__imReady=false;return pdf.output("datauristring")};window.__imReady=true<\/script>`,
      '</head><body><div id="sheet"></div></body></html>'
    ].join('')

    ifr.srcdoc = srcdoc
    ifr.addEventListener('load', async () => {
      const win = ifr.contentWindow!
      const deadline = Date.now() + 15000
      while (!win.__imReady && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 150))
      }
      try {
        if (!win.__imReady) throw new Error('Library PDF gagal dimuat di iframe')
        const dataUrl = await win.__render(html)
        ifr.remove()
        resolve(dataUrl)
      } catch (e: any) {
        ifr.remove()
        reject(new Error(e?.message || 'Gagal membuat PDF'))
      }
    })
  })
}
