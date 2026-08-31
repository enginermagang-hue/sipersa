<script setup lang="ts">
import * as z from 'zod'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: false })

const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (v: boolean) => { colorMode.preference = v ? 'dark' : 'light' }
})

const { login, googleLogin, fetchMe } = useAuth()
const config = useRuntimeConfig()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const error = ref('')
const loading = ref(false)

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
  const onMessage = async (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return
    const data = e.data as any
    if (!data || typeof data.type !== 'string') return
    if (data.type === 'google-auth-success') {
      await fetchMe()
      toast.add({ title: 'Berhasil masuk', description: 'Mengalihkan ke dashboard...', color: 'success' })
      await navigateTo('/', { replace: true })
    } else if (data.type === 'google-auth-error' && typeof data.error === 'string') {
      showGoogleErrorToast(data.error)
    }
  }
  window.addEventListener('message', onMessage)
  onBeforeUnmount(() => window.removeEventListener('message', onMessage))
})

const fields: AuthFormField[] = [
  {
    name: 'username',
    type: 'text',
    label: 'Username / NIP',
    placeholder: 'contoh: 1987xxxx atau admin',
    required: true,
    defaultValue: '',
    eagerValidation: false
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'Minimal 8 karakter',
    required: true,
    defaultValue: '',
    eagerValidation: false
  },
  {
    name: 'remember',
    type: 'checkbox',
    label: 'Ingat saya',
    defaultValue: true
  }
]

const providers = [
  {
    label: 'Login Google',
    icon: 'i-lucide-chrome',
    color: 'neutral' as const,
    variant: 'outline' as const,
    onClick: () => googleLogin()
  },
  {
    label: 'Login SSO ASN',
    icon: 'i-lucide-shield-check',
    color: 'neutral' as const,
    variant: 'outline' as const,
    onClick: () => ssoLogin()
  }
]

const schema = z.object({
  username: z.string({ error: () => 'Username wajib diisi' }).min(1, 'Username wajib diisi'),
  password: z.string({ error: () => 'Password wajib diisi' }).min(1, 'Password wajib diisi').min(8, 'Minimal 8 karakter')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = ''
  try {
    await login(payload.data.username, payload.data.password)
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
  <div class="min-h-screen flex flex-col items-center justify-center bg-default p-4">

    <UPageCard class="relative z-10 w-full max-w-sm">
      <!-- dark mode toggle -->
      <div class="absolute top-4 right-4 z-10">
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

      <div class="flex flex-row items-center justify-center gap-4 pt-2 pb-4">
        <img src="/logo.png" width="48" height="48" alt="Logo SIPERSA" class="size-12 object-contain shrink-0">
        <img src="/ntt.png" width="48" height="48" alt="Logo NTT" class="size-12 object-contain shrink-0">
        <img src="/tutwuri.png" width="48" height="48" alt="Logo Tut Wuri" class="size-12 object-contain shrink-0">
      </div>

      <UAuthForm
        :schema="schema"
        :fields="fields"
        :providers="providers"
        separator="atau"
        title="SI-PERSA"
        description="Sistem Informasi Persuratan dan Arsip"
        :loading="loading"
        :validate-on="['submit', 'change']"
        :submit="{ label: 'Masuk', block: true, icon: 'i-lucide-arrow-right', trailing: true }"
        @submit="onSubmit"
      >
        <template #password-hint>
          <ULink class="text-primary font-medium text-sm cursor-pointer" @click="forgotPassword">Lupa password?</ULink>
        </template>

        <template #validation>
          <UAlert
            v-if="error"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-x"
            :title="error"
          />
        </template>

      </UAuthForm>
    </UPageCard>

    <div class="mt-6 text-center">
      <p class="text-sm leading-relaxed text-muted">UPTD Tekkomdik - Dinas Pendidikan dan Kebudayaan</p>
      <p class="text-sm leading-relaxed text-muted">Provinsi Nusa Tenggara Timur &copy; 2026</p>
    </div>
  </div>
</template>


