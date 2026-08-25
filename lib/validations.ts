import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

export const suratMasukSchema = z.object({
  tgl_surat: z.string().min(1),
  tgl_terima: z.string().min(1),
  pengirim: z.string().min(1),
  perihal: z.string().min(1),
  sifat: z.enum(['biasa', 'segera', 'rahasia', 'penting']).default('biasa'),
  status: z.enum(['diterima', 'didisposisikan', 'selesai']).default('diterima'),
  klasifikasi_id: z.number().int().positive().optional().nullable(),
  no_agenda: z.string().optional().nullable()
})

export const suratKeluarSchema = z.object({
  tgl_surat: z.string().min(1),
  tujuan: z.string().min(1),
  perihal: z.string().min(1),
  sifat: z.enum(['biasa', 'segera', 'rahasia', 'penting']).default('biasa'),
  klasifikasi_id: z.number().int().positive().optional().nullable(),
  status: z.enum(['draft', 'menunggu_persetujuan', 'ditolak', 'terkirim', 'selesai']).default('draft'),
  penandatangan: z.string().optional().default(''),
  html_content: z.string().optional().nullable(),
  render_config: z.string().optional().nullable(),
  no_urut: z.number().int().positive().optional().nullable(),
  no_surat: z.string().optional().nullable()
})

export const suratKeluarApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  catatan: z.string().optional().default('')
})

export const disposisiSchema = z.object({
  surat_masuk_id: z.number().int().positive(),
  kepada_user_ids: z.array(z.number().int().positive()).min(1),
  instruksi_list: z.array(z.string()).default([]),
  instruksi: z.string().optional().default(''),
  catatan: z.string().optional().default(''),
  sifat_disposisi: z.enum(['biasa', 'segera', 'sangat_segera', 'rahasia']).default('biasa'),
  batas_waktu: z.string().optional().default('').or(z.null()),
  notify: z.boolean().default(false)
})

export const teruskanSchema = z.object({
  kepada_user_ids: z.array(z.number().int().positive()).min(1),
  instruksi_list: z.array(z.string()).default([]),
  instruksi: z.string().optional().default(''),
  catatan: z.string().optional().default(''),
  sifat_disposisi: z.enum(['biasa', 'segera', 'sangat_segera', 'rahasia']).default('biasa'),
  batas_waktu: z.string().optional().default('').or(z.null()),
  notify: z.boolean().default(false)
})

export const arsipSchema = z.object({
  nama_dokumen: z.string().min(1),
  lokasi: z.string().optional().default(''),
  tahun: z.number().int().optional().nullable(),
  sifat: z.enum(['biasa', 'segera', 'rahasia', 'penting']).default('biasa'),
  klasifikasi_id: z.number().int().positive().optional().nullable(),
  ref_masuk_id: z.number().int().positive().optional().nullable(),
  ref_keluar_id: z.number().int().positive().optional().nullable()
})

export const klasifikasiSchema = z.object({
  kode: z.string().min(1),
  nama: z.string().min(1),
  deskripsi: z.string().optional().default(''),
  retensi_tahun: z.number().int().optional().nullable()
})

export const userCreateSchema = z.object({
  nama: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  password: z.string().min(4),
  role: z.enum(['admin', 'staff_tu', 'pimpinan']).default('staff_tu')
})

export const userUpdateSchema = z.object({
  nama: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  role: z.enum(['admin', 'staff_tu', 'pimpinan']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  password: z.string().min(4).optional()
})

export const profileUpdateSchema = z.object({
  nama: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  password: z.string().min(4).optional().or(z.literal('')).nullable(),
  no_hp: z.string().optional().or(z.literal('')).nullable(),
  unit_kerja: z.string().optional().or(z.literal('')).nullable(),
  jabatan: z.string().optional().or(z.literal('')).nullable(),
  tanggal_bergabung: z.string().optional().or(z.literal('')).nullable(),
  email_notifikasi: z.boolean().optional()
})
