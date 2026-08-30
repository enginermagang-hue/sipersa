import { marked } from 'marked'

export interface PanduanBab {
  slug: string
  file: string
  title: string
  desc: string
  icon: string
  order: number
}

export const PANDUAN_BABS: PanduanBab[] = [
  { slug: 'pengantar', file: '01-pengantar.md', title: '1. Pengantar SIPERSA', desc: 'Gambaran, karakter & peran pengguna', icon: 'i-lucide-rocket', order: 1 },
  { slug: 'akses-login', file: '02-akses-login.md', title: '2. Akses & Login', desc: 'Login NIP, Google OAuth & SSO', icon: 'i-lucide-log-in', order: 2 },
  { slug: 'antarmuka-navigasi', file: '03-antarmuka-navigasi.md', title: '3. Antarmuka & Navigasi', desc: 'Layout, menu peran & pencarian cepat', icon: 'i-lucide-layout-dashboard', order: 3 },
  { slug: 'dashboard', file: '04-dashboard.md', title: '4. Dashboard', desc: 'KPI, grafik & ringkasan', icon: 'i-lucide-chart-column', order: 4 },
  { slug: 'surat-masuk', file: '05-surat-masuk.md', title: '5. Surat Masuk', desc: 'Daftar, tambah, detail & disposisi', icon: 'i-lucide-inbox', order: 5 },
  { slug: 'surat-keluar', file: '06-surat-keluar.md', title: '6. Surat Keluar', desc: 'Tulis editor, approval & TTD digital', icon: 'i-lucide-send', order: 6 },
  { slug: 'disposisi', file: '07-disposisi.md', title: '7. Disposisi', desc: 'Inbox, kelola & terusan disposisi', icon: 'i-lucide-share-2', order: 7 },
  { slug: 'arsip', file: '08-arsip.md', title: '8. Arsip', desc: 'Retensi, taut surat & pemusnahan', icon: 'i-lucide-archive', order: 8 },
  { slug: 'laporan', file: '09-laporan.md', title: '9. Laporan', desc: 'Filter, KPI & export Excel/PDF', icon: 'i-lucide-file-bar-chart', order: 9 },
  { slug: 'pencarian', file: '10-pencarian.md', title: '10. Pencarian Global', desc: 'Cari surat & arsip lintas modul', icon: 'i-lucide-search', order: 10 },
  { slug: 'profil', file: '11-profil.md', title: '11. Profil Saya', desc: 'Akun, keamanan & tanda tangan', icon: 'i-lucide-user', order: 11 },
  { slug: 'admin', file: '12-admin.md', title: '12. Admin — Khusus Admin', desc: 'Users, sesi, klasifikasi & log', icon: 'i-lucide-settings', order: 12 },
  { slug: 'faq', file: '13-faq.md', title: '13. FAQ & Bantuan', desc: 'Troubleshooting & kontak', icon: 'i-lucide-circle-help', order: 13 },
  { slug: 'appendix-a', file: 'appendix-a.md', title: 'Appendix A — Alur Kerja per Peran', desc: 'Staff TU, pimpinan & admin', icon: 'i-lucide-route', order: 14 },
  { slug: 'appendix-b', file: 'appendix-b.md', title: 'Appendix B — Glosarium', desc: 'Istilah & status', icon: 'i-lucide-book-marked', order: 15 },
  { slug: 'appendix-c', file: 'appendix-c.md', title: 'Appendix C — Referensi Teknis', desc: 'Env, deploy & migrasi DB', icon: 'i-lucide-wrench', order: 16 },
]

export function getBab(slug: string): PanduanBab | undefined {
  return PANDUAN_BABS.find(b => b.slug === slug)
}

export function getPrevNext(slug: string): { prev: PanduanBab | null; next: PanduanBab | null } {
  const idx = PANDUAN_BABS.findIndex(b => b.slug === slug)
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: idx > 0 ? PANDUAN_BABS[idx - 1] : null,
    next: idx < PANDUAN_BABS.length - 1 ? PANDUAN_BABS[idx + 1] : null,
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u00C0-\u024F\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface PanduanHeading {
  depth: number
  text: string
  slug: string
}

export function extractHeadings(markdown: string, minDepth = 3, maxDepth = 3): PanduanHeading[] {
  const tokens = marked.lexer(markdown)
  const headings: PanduanHeading[] = []
  const seen = new Map<string, number>()
  for (const t of tokens) {
    if (t.type === 'heading' && t.depth >= minDepth && t.depth <= maxDepth) {
      const raw = (t as any).text as string
      const plain = raw.replace(/`[^`]*`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      let slug = slugify(plain)
      const c = seen.get(slug) || 0
      if (c) slug = `${slug}-${c + 1}`
      seen.set(slugify(plain), c + 1)
      headings.push({ depth: t.depth, text: plain, slug })
    }
  }
  return headings
}
