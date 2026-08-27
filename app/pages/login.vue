<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

definePageMeta({ layout: false })
const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (v: boolean) => { colorMode.preference = v ? 'dark' : 'light' }
})
const { login, googleLogin } = useAuth()
const config = useRuntimeConfig()
const toast = useToast()
const route = useRoute()
const router = useRouter()
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

function showGoogleErrorToast(code: string) {
  const msg = GOOGLE_ERROR_MESSAGES[code]
  if (!msg) return
  error.value = msg
  const isWarning = code === 'google-unregistered' || code === 'google-inactive'
  const isCancelled = code === 'google-cancelled'
  toast.add({
    title: isWarning ? 'Akun tidak terdaftar' : isCancelled ? 'Login dibatalkan' : 'Login Google gagal',
    description: msg,
    color: isWarning ? 'warning' : isCancelled ? 'neutral' : 'error',
    icon: isWarning ? 'i-lucide-triangle-alert' : isCancelled ? 'i-lucide-circle-pause' : 'i-lucide-circle-x'
  })
}

onMounted(() => {
  const q = route.query.error
  if (typeof q === 'string' && GOOGLE_ERROR_MESSAGES[q]) {
    showGoogleErrorToast(q)
    router.replace({ query: {} })
  }
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return
    const data = e.data as any
    if (!data || typeof data.type !== 'string') return
    if (data.type === 'google-auth-success') {
      toast.add({ title: 'Berhasil masuk', description: 'Mengalihkan ke dashboard...', color: 'success' })
      navigateTo('/')
    } else if (data.type === 'google-auth-error' && typeof data.error === 'string') {
      showGoogleErrorToast(data.error)
    }
  }
  window.addEventListener('message', onMessage)
  onBeforeUnmount(() => window.removeEventListener('message', onMessage))
})

function handleGoogleLogin() {
  googleLogin()
}

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
  <div class="relative isolate min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-violet-100 via-indigo-50 to-slate-100 p-4 font-sans dark:from-slate-950 dark:via-violet-950/30 dark:to-indigo-950/30">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="login-blob login-blob-1 absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-violet-400/30 to-indigo-400/30 blur-3xl dark:from-violet-600/20 dark:to-indigo-600/20" />
      <div class="login-blob login-blob-2 absolute -bottom-32 -right-32 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-indigo-300/30 to-sky-300/30 blur-3xl dark:from-indigo-700/15 dark:to-sky-700/15" />
      <div class="login-blob login-blob-3 absolute top-1/2 left-1/2 hidden h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple-200/20 to-violet-200/20 blur-3xl lg:block dark:from-purple-800/10 dark:to-violet-800/10" />
    </div>
    <div aria-hidden="true" class="bubbles pointer-events-none absolute inset-0 overflow-hidden">
      <span class="bubble" style="left:6%;width:44px;height:44px;--dur:16s;--delay:-1s;--drift:22px"></span>
      <span class="bubble" style="left:14%;width:28px;height:28px;--dur:13s;--delay:-4s;--drift:-18px"></span>
      <span class="bubble" style="left:22%;width:56px;height:56px;--dur:18s;--delay:-7s;--drift:30px"></span>
      <span class="bubble" style="left:32%;width:20px;height:20px;--dur:12s;--delay:-2s;--drift:-14px"></span>
      <span class="bubble" style="left:41%;width:36px;height:36px;--dur:15s;--delay:-9s;--drift:18px"></span>
      <span class="bubble" style="left:50%;width:64px;height:64px;--dur:19s;--delay:-5s;--drift:-26px"></span>
      <span class="bubble" style="left:61%;width:24px;height:24px;--dur:13s;--delay:-11s;--drift:20px"></span>
      <span class="bubble" style="left:70%;width:48px;height:48px;--dur:17s;--delay:-3s;--drift:-22px"></span>
      <span class="bubble" style="left:78%;width:32px;height:32px;--dur:14s;--delay:-8s;--drift:16px"></span>
      <span class="bubble" style="left:86%;width:52px;height:52px;--dur:18s;--delay:-6s;--drift:-30px"></span>
      <span class="bubble" style="left:92%;width:18px;height:18px;--dur:11s;--delay:-10s;--drift:12px"></span>
      <span class="bubble" style="left:3%;width:30px;height:30px;--dur:15s;--delay:-12s;--drift:-16px"></span>
    </div>
    <div class="relative z-10 w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white shadow-sm p-6 lg:p-8 dark:border-slate-800 dark:bg-slate-900">
      <div class="absolute top-4 right-4">
        <ClientOnly>
          <USwitch
            v-model="isDark"
            unchecked-icon="i-lucide-sun"
            checked-icon="i-lucide-moon"
            aria-label="Toggle mode gelap"
          />
          <template #fallback>
            <USwitch disabled :model-value="false" aria-hidden="true" />
          </template>
        </ClientOnly>
      </div>
      <div class="flex flex-col items-center text-center">
        <div class="flex flex-row items-center gap-4">
          <img src="/ntt.png" width="48">
          <img src="/tutwuri.png" width="48">
        </div>
        <h1 class="mt-3 text-xl font-bold text-violet-900 dark:text-white" style="letter-spacing: 5px;">{{ config.public.appName || 'SIPERSA' }}</h1>
        <p class="text-sm tracking-wide text-slate-500 dark:text-slate-400">Sistem Persuratan &amp; Arsip Digital</p>
        <h1 class="mt-6 text-xl font-bold text-slate-900 dark:text-white">Masuk ke akun Anda</h1>
      </div>

      <UForm :state="state" :validate="validate" class="mt-7 space-y-5" @submit="submit">
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

        <UButton type="submit" block size="xl" class="btn-login h-12 rounded-lg" :loading="loading">
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

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UButton
          block
          size="xl"
          variant="outline"
          color="neutral"
          class="h-12 rounded-lg border-slate-200 dark:border-slate-700"
          @click="handleGoogleLogin"
        >
          <svg class="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Login Google
        </UButton>

        <UButton block size="xl" variant="outline" color="neutral" class="h-12 rounded-lg border-slate-200 dark:border-slate-700" @click="ssoLogin">
          <UIcon name="i-lucide-shield-check" class="size-5 text-slate-500 dark:text-slate-400" />
          Login SSO ASN
        </UButton>
      </div>

      <p class="mt-10 text-center text-sm leading-relaxed text-slate-400 dark:text-slate-500">UPTD Tekkomdik - Dinas Pendidikan dan Kebudayaan</p>
      <p class="text-center text-sm leading-relaxed text-slate-400 dark:text-slate-500">Provinsi Nusa Tenggara Timur &copy; 2026</p>
    </div>
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
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(18px, -18px) scale(1.04); }
  66% { transform: translate(-14px, 14px) scale(0.97); }
}
.login-blob { animation: float 10s ease-in-out infinite; }
.login-blob-2 { animation-delay: 2s; animation-duration: 12s; }
.login-blob-3 { animation-delay: 4s; animation-duration: 14s; }
@media (prefers-reduced-motion: reduce) {
  .login-blob { animation: none; }
  .bubble { animation: none !important; display: none; }
}
.bubble {
  position: absolute;
  bottom: -70px;
  border-radius: 9999px;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.35) 35%, rgba(255,255,255,0.08) 70%);
  border: 1px solid rgba(255,255,255,0.45);
  box-shadow: inset -6px -6px 12px rgba(255,255,255,0.35), 0 2px 10px rgba(99,102,241,0.12);
  animation: bubble-rise var(--dur, 15s) linear infinite;
  animation-delay: var(--delay, 0s);
}
:where(.dark) .bubble {
  background: radial-gradient(circle at 30% 30%, rgba(167,139,250,0.22) 0%, rgba(129,140,248,0.14) 40%, rgba(255,255,255,0.04) 75%);
  border-color: rgba(167,139,250,0.18);
  box-shadow: inset -6px -6px 12px rgba(167,139,250,0.12), 0 2px 10px rgba(0,0,0,0.25);
}
@keyframes bubble-rise {
  0% { transform: translateY(0) translateX(0) scale(0.9); opacity: 0; }
  10% { opacity: 0.75; }
  85% { opacity: 0.5; }
  100% { transform: translateY(-115vh) translateX(var(--drift, 0px)) scale(1.08); opacity: 0; }
}
</style>
