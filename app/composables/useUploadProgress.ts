export function uploadFormDataWithProgress(
  url: string,
  fd: FormData,
  opts: { method: string; onProgress?: (pct: number, status: string) => void }
): Promise<any> {
  return uploadFormDataWithProgressSequential(url, fd, [], opts)
}

export function uploadFormDataWithProgressSequential(
  url: string,
  fd: FormData,
  files: File[],
  opts: { method: string; onProgress?: (pct: number, status: string, fileIndex?: number) => void }
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(opts.method.toUpperCase(), url, true)
    xhr.setRequestHeader('Accept', 'application/json')

    const totalFiles = files.length
    const totalBytes = files.reduce((a, f) => a + f.size, 0) || 1

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        const overallPct = Math.round((e.loaded / e.total) * 70)
        // derive sequential file index from uploaded bytes proportion
        let cum = 0
        let idx = 0
        let filePct = 0
        for (let i = 0; i < totalFiles; i++) {
          const nextCum = cum + files[i].size
          const shareStart = (cum / totalBytes) * 70
          const shareEnd = (nextCum / totalBytes) * 70
          if (e.loaded * 70 / e.total >= shareStart && e.loaded * 70 / e.total < shareEnd) {
            idx = i
            filePct = Math.round(((e.loaded * 70 / e.total - shareStart) / (shareEnd - shareStart)) * 100)
            break
          }
          if (e.loaded >= e.total) { idx = totalFiles - 1; filePct = 100 }
          cum = nextCum
        }
        const name = totalFiles ? files[idx]?.name || '' : ''
        const status = totalFiles > 1
          ? `Mengunggah ${idx + 1}/${totalFiles} — ${name} ${filePct}%`
          : `Mengunggah file… ${overallPct}%`
        opts.onProgress(overallPct, status, idx)
      } else if (opts.onProgress) {
        opts.onProgress(0, totalFiles > 1 ? `Mengunggah 1/${totalFiles}…` : 'Mengunggah file…', 0)
      }
    }

    xhr.onload = () => {
      const text = xhr.responseText
      let data: any = null
      try { data = text ? JSON.parse(text) : null } catch { data = text }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (opts.onProgress) opts.onProgress(100, 'Menyimpan…')
        resolve(data)
      } else {
        const err: any = new Error(data?.statusMessage || data?.message || `Gagal (${xhr.status})`)
        err.statusCode = data?.statusCode || xhr.status
        err.data = data
        err.statusMessage = data?.statusMessage || err.message
        reject(err)
      }
    }

    xhr.onerror = () => {
      const err: any = new Error('Gagal terhubung ke server')
      err.statusCode = 0
      err.data = { statusMessage: 'Gagal terhubung ke server. Periksa koneksi.' }
      reject(err)
    }

    xhr.ontimeout = () => {
      const err: any = new Error('Waktu habis')
      err.statusCode = 408
      err.data = { statusMessage: 'Waktu upload habis. Coba lagi.' }
      reject(err)
    }

    // simulate 70->90 while waiting for Dropbox server processing
    if (opts.onProgress) opts.onProgress(5, 'Menyiapkan upload…')
    xhr.send(fd)
  })
}

export function mapUploadError(e: any): { title: string; description: string } {
  const status: number = e?.statusCode ?? e?.data?.statusCode ?? 0
  const rawMsg: string = e?.data?.statusMessage || e?.statusMessage || e?.message || 'Gagal menyimpan'
  const data = e?.data?.data

  if (status === 422 && Array.isArray(data)) {
    const desc = data.map((i: any) => `${(i.path || []).join('.')}: ${i.message}`).join('\n') || rawMsg
    return { title: 'Data tidak valid', description: desc }
  }
  if (status === 413) return { title: 'File terlalu besar', description: rawMsg }
  if (status === 409) return { title: 'No. Surat sudah dipakai', description: `${rawMsg} — ganti nomor atau kosongkan untuk auto.` }
  if (status === 401 || status === 403) return { title: 'Token Dropbox bermasalah', description: `${rawMsg} — periksa NUXT_DROPBOX_* di .env` }
  if (status === 429) return { title: 'Dropbox rate limit', description: rawMsg }
  if (status === 502) return { title: 'Gagal upload ke Dropbox', description: rawMsg }
  if (status === 0) return { title: 'Gagal terhubung', description: rawMsg }
  if (status === 408) return { title: 'Waktu habis', description: rawMsg }
  return { title: rawMsg, description: rawMsg !== 'Gagal menyimpan' ? rawMsg : 'Terjadi kesalahan saat menyimpan. Coba lagi.' }
}
