<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

definePageMeta({ layout: false })
const { login, googleLogin } = useAuth()
const config = useRuntimeConfig()
const toast = useToast()
const route = useRoute()
const state = reactive({ username: '', password: '' })
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const remember = ref(true)

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  'google-config': 'Login Google belum dikonfigurasi. Hubungi admin.',
  'google-cancelled': 'Login Google dibatalkan.',
  'google-unregistered': 'Akun Google tidak terdaftar. Hubungi admin.',
  'google-inactive': 'Akun nonaktif. Hubungi admin.',
  'google': 'Login Google gagal. Silakan coba lagi.'
}

onMounted(() => {
  const q = route.query.error
  if (typeof q === 'string' && GOOGLE_ERROR_MESSAGES[q]) {
    error.value = GOOGLE_ERROR_MESSAGES[q]
  }
})

function validate(s: Partial<typeof state>): FormError[] {
  const errors: FormError[] = []
  if (!s.username) errors.push({ name: 'username', message: 'Username wajib diisi' })
  if (!s.password) errors.push({ name: 'password', message: 'Password wajib diisi' })
  return errors
}

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await login(state.username, state.password)
    toast.add({ title: 'Berhasil masuk', description: 'Mengalihkan ke dashboard...', color: 'success' })
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Username atau password salah'
  } finally {
    loading.value = false
  }
}

function forgotPassword() {
  toast.add({ title: 'Lupa password', description: 'Hubungi admin untuk mereset password Anda.', color: 'info' })
}

function ssoLogin() {
  toast.add({ title: 'SSO belum tersedia', description: 'Fitur Masuk dengan SSO ASN masih dalam pengembangan.', color: 'warning' })
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-[45%_55%] font-sans">
    <aside
      class="relative overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-800 text-white flex flex-col lg:justify-between gap-6 p-6 lg:p-12"
    >
      <div
        class="absolute inset-0 opacity-60"
        :style="{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)', backgroundSize: '22px 22px' }"
      />
      <div class="absolute -top-24 -left-24 size-80 rounded-full bg-indigo-500/40 blur-3xl" />
      <div class="absolute -bottom-32 -right-24 size-96 rounded-full bg-violet-500/30 blur-3xl" />

      <div class="relative z-10 flex flex-col gap-5 lg:gap-8">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center size-10 rounded-xl bg-white/10 ring-1 ring-white/15">
            <UIcon name="i-lucide-archive" class="size-5 text-indigo-300" />
          </div>
          <div>
            <p class="text-base font-bold leading-none">{{ config.public.appName || 'SIPERSA' }}</p>
            <p class="mt-1 text-[10px] tracking-wide text-slate-400">Sistem Persuratan &amp; Arsip</p>
          </div>
        </div>

        <div>
          <h1 class="hidden lg:block text-3xl xl:text-4xl font-extrabold leading-tight">
            Kelola Surat &amp; Arsip<br />Jadi <span class="text-indigo-300">Lebih Mudah.</span>
          </h1>
          <h1 class="lg:hidden text-xl font-bold leading-snug">
            Kelola Surat &amp; Arsip Jadi <span class="text-indigo-300">Lebih Mudah.</span>
          </h1>
          <p class="hidden lg:block mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            Platform digital terintegrasi untuk pengelolaan surat masuk, surat keluar, disposisi, dan
            pengarsipan sesuai standar kearsipan.
          </p>
        </div>

        <ul class="hidden lg:flex flex-col gap-4">
          <li class="flex items-center gap-3 text-sm text-slate-200">
            <span class="flex items-center justify-center size-6 rounded-full bg-white/10 ring-1 ring-white/15">
              <UIcon name="i-lucide-check" class="size-3.5 text-indigo-300" />
            </span>
            Manajemen Surat Masuk &amp; Keluar
          </li>
          <li class="flex items-center gap-3 text-sm text-slate-200">
            <span class="flex items-center justify-center size-6 rounded-full bg-white/10 ring-1 ring-white/15">
              <UIcon name="i-lucide-check" class="size-3.5 text-indigo-300" />
            </span>
            Klasifikasi &amp; Jadwal Retensi Arsip
          </li>
          <li class="flex items-center gap-3 text-sm text-slate-200">
            <span class="flex items-center justify-center size-6 rounded-full bg-white/10 ring-1 ring-white/15">
              <UIcon name="i-lucide-check" class="size-3.5 text-indigo-300" />
            </span>
            Disposisi &amp; Tracking Real-time
          </li>
          <li class="flex items-center gap-3 text-sm text-slate-200">
            <span class="flex items-center justify-center size-6 rounded-full bg-white/10 ring-1 ring-white/15">
              <UIcon name="i-lucide-check" class="size-3.5 text-indigo-300" />
            </span>
            Keamanan Berlapis &amp; Audit Trail
          </li>
        </ul>
      </div>

      <div class="hidden lg:block relative z-10">
        <blockquote class="rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur px-5 py-4 shadow-lg shadow-black/10">
          <p class="text-sm text-white/90">&ldquo;Proses disposisi yang tadinya 2 hari jadi 10 menit&rdquo;</p>
          <footer class="mt-2 text-xs text-slate-400">— Biro Umum</footer>
        </blockquote>
      </div>

      <p class="hidden lg:block relative z-10 text-xs text-white/50">© 2026 SIPAS v2.4</p>
    </aside>

    <main class="relative flex items-center justify-center bg-white p-6 lg:p-12 dark:bg-slate-950">
      <UColorModeButton
        class="absolute top-6 right-6 rounded-full"
        size="lg"
        variant="ghost"
        color="neutral"
      />

      <div class="w-full max-w-[420px]">
        <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Selamat Datang Kembali
        </span>

        <h2 class="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Masuk ke akun Anda</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Masukkan kredensial untuk mengakses dashboard</p>

        <div class="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm p-6 lg:p-8 dark:border-slate-800 dark:bg-slate-900">
          <UForm :state="state" :validate="validate" class="space-y-5" @submit="submit">
            <UFormField label="Username / NIP" name="username">
              <UInput
                v-model="state.username"
                class="login-input w-full"
                size="xl"
                :ui="{ base: 'h-12' }"
                placeholder="contoh: 1987xxxx atau admin"
                autocomplete="username"
              >
                <template #leading>
                  <UIcon name="i-lucide-user" class="size-5 text-slate-400 dark:text-slate-500" />
                </template>
              </UInput>
            </UFormField>

            <UFormField label="Password" name="password">
              <UInput
                v-model="state.password"
                :type="showPassword ? 'text' : 'password'"
                class="login-input w-full"
                size="xl"
                :ui="{ base: 'h-12' }"
                placeholder="Minimal 8 karakter"
                autocomplete="current-password"
              >
                <template #leading>
                  <UIcon name="i-lucide-lock" class="size-5 text-slate-400 dark:text-slate-500" />
                </template>
                <template #trailing>
                  <UButton
                    variant="link"
                    color="gray"
                    :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                    @click="showPassword = !showPassword"
                  >
                    <UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="size-5 text-slate-400 dark:text-slate-500" />
                  </UButton>
                </template>
              </UInput>
            </UFormField>

            <div class="flex items-center justify-between pt-1">
              <UCheckbox v-model="remember" label="Ingat saya" />
              <UButton variant="link" class="!text-indigo-600 text-sm" @click="forgotPassword">
                Lupa password?
              </UButton>
            </div>

            <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

            <UButton
              type="submit"
              block
              size="xl"
              class="btn-login h-12 rounded-lg"
              :loading="loading"
            >
              Masuk
              <template v-if="!loading" #trailing>
                <UIcon name="i-lucide-arrow-right" class="size-5" />
              </template>
            </UButton>
          </UForm>

          <div class="flex items-center gap-3 my-6">
            <span class="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span class="text-xs text-slate-400 dark:text-slate-500">atau</span>
            <span class="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <div class="flex flex-col gap-3">
            <UButton
              block
              size="xl"
              variant="outline"
              color="neutral"
              class="h-12 rounded-lg border-slate-200 dark:border-slate-700"
              @click="googleLogin"
            >
              <svg class="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Masuk dengan Google
            </UButton>

            <UButton block size="xl" variant="outline" color="neutral" class="h-12 rounded-lg border-slate-200 dark:border-slate-700" @click="ssoLogin">
              <UIcon name="i-lucide-shield-check" class="size-5 text-slate-500 dark:text-slate-400" />
              Masuk dengan SSO ASN
            </UButton>
          </div>
        </div>

        <div class="mt-5 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-700 dark:border-sky-900 dark:bg-sky-950/70 dark:text-sky-300">
          <UIcon name="i-lucide-info" class="size-4 mt-0.5 shrink-0 text-sky-500 dark:text-sky-400" />
          <span>Gunakan akun e-Office terdaftar. Hubungi admin jika kendala login.</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.login-input:focus-within {
  --tw-ring-color: rgb(99 102 241 / 0.45) !important;
  --tw-ring-opacity: 1;
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.btn-login {
  background-color: #4f46e5 !important;
}
.btn-login:not([disabled]):hover {
  background-color: #4338ca !important;
}
.btn-login[disabled] {
  background-color: #6366f1 !important;
  opacity: 0.7;
}
</style>
