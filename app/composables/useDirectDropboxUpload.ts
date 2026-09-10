export const DROPBOX_FOLDERS = {
  SM: 'Surat Masuk',
  SK: 'Surat Keluar',
  ARSIP: 'Arsip',
  TT: 'Tanda Tangan'
} as const
export type DropboxFolder = typeof DROPBOX_FOLDERS[keyof typeof DROPBOX_FOLDERS]

export async function uploadFotoDirect(
  file: File,
  folder: DropboxFolder,
  onProgress?: (pct: number, status: string) => void,
  noSuratPrefix?: string
): Promise<{ id: string; name: string }> {
  const tokenRes: any = await $fetch('/api/dropbox/token')
  const token = tokenRes.token as string
  if (!token) throw new Error('Gagal mendapatkan token Dropbox')

  const safe = (noSuratPrefix ? `${noSuratPrefix}_${file.name}` : file.name).replace(/[\\/]/g, '-')
  const path = `/${folder}/${safe}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'https://content.dropboxapi.com/2/files/upload', true)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('Dropbox-API-Arg', JSON.stringify({ path, mode: 'add', autorename: true }))
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100)
        onProgress(pct, `Upload foto ${file.name} ${pct}%`)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText)
          resolve({ id: json.id, name: json.name })
        } catch {
          reject(new Error('Response Dropbox tidak valid'))
        }
      } else {
        let msg = xhr.responseText.slice(0, 300)
        try {
          const j = JSON.parse(xhr.responseText)
          msg = j?.error_summary || j?.error?.['.tag'] || msg
        } catch {}
        const err: any = new Error(`Dropbox ${xhr.status}: ${msg}`)
        err.statusCode = xhr.status
        err.data = { statusMessage: msg }
        reject(err)
      }
    }
    xhr.onerror = () => {
      const err: any = new Error('Gagal terhubung ke Dropbox')
      err.statusCode = 0
      reject(err)
    }
    xhr.send(file)
  })
}


