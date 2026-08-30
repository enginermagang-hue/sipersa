<script setup lang="ts">
import { marked } from 'marked'

definePageMeta({ layout: 'panduan' })

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data, pending, error } = await useFetch(() => `/api/panduan/${slug.value}`)

const bab = computed(() => (data.value as any)?.bab as any | undefined)
const prev = computed(() => (data.value as any)?.prev as any | null)
const next = computed(() => (data.value as any)?.next as any | null)

const config = useRuntimeConfig()

watch(() => (data.value as any)?.bab?.title, (t) => {
  if (t) useSeoMeta({ title: `${t} - Panduan SIPERSA`, description: (data.value as any)?.bab?.desc || '' })
}, { immediate: true })

// If API returns 404, show error
if (import.meta.client) {
  watch(error, (e: any) => {
    if (e?.statusCode === 404) {
      // handled by UAlert
    }
  })
}

const breadcrumbItems = computed(() => [
  { label: 'Beranda', to: '/' },
  { label: 'Panduan', to: '/panduan' },
  { label: bab.value?.title || slug.value },
])

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\u00C0-\u024F\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

const renderedHtml = computed(() => {
  const md = (data.value as any)?.markdown as string | undefined
  if (!md) return ''
  const raw = marked.parse(md, { async: false }) as string
  let withIds = raw
  const seen = new Map<string, number>()
  // bab file starts with H2 as title, inject id for H2+H3
  withIds = withIds.replace(/<h([23])>(.*?)<\/h\1>/g, (_m, lvl, inner) => {
    const plain = inner.replace(/<[^>]+>/g, '').replace(/`[^`]*`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    let s = slugify(plain)
    const c = seen.get(s) || 0
    if (c) s = `${s}-${c + 1}`
    seen.set(slugify(plain), c + 1)
    return `<h${lvl} id="${s}">${inner} <a href="#${s}" class="panduan-anchor" aria-label="Tautan ke bagian ini">#</a></h${lvl}>`
  })
  return withIds
})

const headings = computed(() => ((data.value as any)?.headings as Array<{ depth: number; text: string; slug: string }>) || [])
const searchQuery = ref('')
const activeSlug = ref('')
const filteredHeadings = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return headings.value
  return headings.value.filter(h => h.text.toLowerCase().includes(q))
})

let observer: IntersectionObserver | null = null
function setupObserver() {
  if (!import.meta.client) return
  const ids = headings.value.map(h => h.slug)
  // include H2 id as well (first heading is H2 bab title)
  // rendered Html H2 will have id, so include it
  const allIds = headings.value.map(h => h.slug)
  // also try to get H2 via DOM query all h2/h3
  const els = allIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[]
  // fallback: query all h2/h3 in prose
  const prose = document.querySelector('.panduan-prose')
  const fallback = prose ? Array.from(prose.querySelectorAll('h2[id], h3[id]')) as HTMLElement[] : []
  const toObserve = els.length ? els : fallback
  if (!toObserve.length) return
  if (observer) observer.disconnect()
  observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
    if (visible[0]?.target?.id) activeSlug.value = visible[0].target.id
  }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.5, 1] })
  toObserve.forEach(el => observer!.observe(el))
}

watch(() => headings.value.length, () => nextTick(() => setupObserver()))
onMounted(() => {
  nextTick(() => setupObserver())
  const hash = window.location.hash.slice(1)
  if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
})
onBeforeUnmount(() => observer?.disconnect())

function scrollTo(s: string) {
  const el = document.getElementById(s)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', `#${s}`)
    activeSlug.value = s
  }
}

const tocOpen = ref(false)
const copied = ref(false)
async function copyLink(s: string) {
  const url = `${window.location.origin}/panduan/${slug.value}#${s}`
  await navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => copied.value = false, 1500)
}
</script>

<template>
  <div class="space-y-4">
    <UBreadcrumb :items="breadcrumbItems" />

    <UAlert v-if="error" color="error" variant="subtle" :title="(error as any)?.statusCode === 404 ? 'Halaman tidak ditemukan' : 'Gagal memuat panduan'" :description="(error as any)?.statusMessage || 'Coba kembali ke daftar panduan.'" >
      <template #description>
        <div class="flex gap-2 mt-2">
          <UButton to="/panduan" icon="i-lucide-arrow-left" size="sm">Kembali ke Daftar</UButton>
        </div>
      </template>
    </UAlert>

    <div v-if="pending" class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <USkeleton class="lg:col-span-3 h-[60vh]" />
      <USkeleton class="lg:col-span-9 h-[60vh]" />
    </div>

    <template v-else-if="data && bab">
      <!-- Bab header -->
      <UCard class="overflow-hidden">
        <div class="relative -m-6 p-6 sm:p-8 bg-gradient-to-br from-violet-50 via-indigo-50 to-sky-50 dark:from-slate-900 dark:via-violet-950/20 dark:to-indigo-950/30">
          <div aria-hidden="true" class="pointer-events-none absolute -top-12 -right-12 h-56 w-56 rounded-full bg-gradient-to-br from-violet-400/20 to-indigo-400/20 blur-2xl" />
          <div class="relative flex flex-col gap-3">
            <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
              <UBadge :icon="bab.icon" variant="subtle" color="primary" size="sm" class="rounded-full">{{ bab.title }}</UBadge>
              <span class="hidden sm:inline">•</span>
              <span class="font-mono text-[11px]">{{ (data as any).file }}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">{{ bab.title }}</h1>
            <p class="text-sm text-muted max-w-2xl leading-relaxed">{{ bab.desc }}</p>
            <div class="flex flex-wrap gap-2">
              <UButton to="/panduan" variant="outline" size="xs" icon="i-lucide-arrow-left">Daftar Panduan</UButton>
              <UButton v-if="prev" :to="`/panduan/${prev.slug}`" variant="ghost" size="xs" icon="i-lucide-chevron-left">{{ prev.title }}</UButton>
              <UButton v-if="next" :to="`/panduan/${next.slug}`" variant="ghost" size="xs" trailing-icon="i-lucide-chevron-right">{{ next.title }}</UButton>
            </div>
          </div>
        </div>
      </UCard>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <!-- TOC desktop -->
        <div class="hidden lg:block lg:col-span-3 lg:sticky lg:top-20 self-start space-y-3">
          <UCard :ui="{ body: 'p-0' }">
            <div class="p-3 border-b border-default space-y-2">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-list-tree" class="w-4 h-4 text-muted" />
                <span class="text-sm font-semibold">Di halaman ini</span>
                <span class="ml-auto text-xs text-muted">{{ filteredHeadings.length }}/{{ headings.length }}</span>
              </div>
              <UInput v-model="searchQuery" placeholder="Cari sub-bab..." icon="i-lucide-search" size="sm" class="w-full" />
            </div>
            <div class="max-h-[50vh] overflow-y-auto custom-scrollbar p-2 space-y-0.5">
              <template v-if="headings.length">
                <button
                  v-for="h in filteredHeadings"
                  :key="h.slug"
                  :class="[
                    'w-full text-left rounded-lg px-2 py-1.5 text-sm leading-snug hover:bg-elevated transition-colors',
                    'ml-3 text-xs border-l border-default pl-3',
                    activeSlug === h.slug ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 font-semibold' : 'text-muted hover:text-default'
                  ]"
                  @click="scrollTo(h.slug)"
                >
                  {{ h.text }}
                </button>
              </template>
              <p v-else class="text-xs text-muted p-3 text-center">Tidak ada sub-bab</p>
              <p v-if="headings.length && !filteredHeadings.length" class="text-xs text-muted p-3 text-center">Tidak ada hasil untuk “{{ searchQuery }}”</p>
            </div>
          </UCard>

          <!-- Nav antar bab -->
          <UCard :ui="{ body: 'p-3' }">
            <p class="text-xs font-semibold mb-2 flex items-center gap-1.5"><UIcon name="i-lucide-book-open" class="w-3.5 h-3.5" /> Navigasi Bab</p>
            <div class="flex flex-col gap-1.5">
              <UButton v-if="prev" :to="`/panduan/${prev.slug}`" variant="outline" size="xs" icon="i-lucide-chevron-left" block class="justify-start">{{ prev.title }}</UButton>
              <UButton to="/panduan" variant="ghost" size="xs" icon="i-lucide-list" block class="justify-start">Daftar Isi</UButton>
              <UButton v-if="next" :to="`/panduan/${next.slug}`" variant="solid" size="xs" trailing-icon="i-lucide-chevron-right" block class="justify-start">{{ next.title }}</UButton>
            </div>
          </UCard>
        </div>

        <!-- Mobile TOC -->
        <div class="lg:hidden">
          <UButton block variant="outline" icon="i-lucide-list-tree" @click="tocOpen = true">
            Daftar Isi — {{ headings.length ? `${headings.length} sub-bab` : 'Tidak ada sub-bab' }}
          </UButton>
          <USlideover v-model:open="tocOpen" title="Di halaman ini" :description="bab.title" side="left" :ui="{ content: 'max-w-sm' }">
            <template #body>
              <UInput v-model="searchQuery" placeholder="Cari sub-bab..." icon="i-lucide-search" size="sm" class="w-full mb-3" />
              <div class="space-y-0.5 max-h-[60vh] overflow-y-auto pr-1">
                <button
                  v-for="h in filteredHeadings"
                  :key="h.slug"
                  class="w-full text-left rounded-lg px-2 py-1.5 text-sm hover:bg-elevated ml-3 text-xs border-l border-default pl-3"
                  :class="activeSlug === h.slug ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40' : 'text-muted'"
                  @click="() => { scrollTo(h.slug); tocOpen = false }"
                >
                  {{ h.text }}
                </button>
                <p v-if="!headings.length" class="text-xs text-muted p-3 text-center">Tidak ada sub-bab</p>
              </div>
              <div class="mt-4 space-y-2 border-t border-default pt-3">
                <UButton v-if="prev" :to="`/panduan/${prev.slug}`" variant="outline" size="sm" icon="i-lucide-chevron-left" block @click="tocOpen=false">{{ prev.title }}</UButton>
                <UButton v-if="next" :to="`/panduan/${next.slug}`" variant="solid" size="sm" trailing-icon="i-lucide-chevron-right" block @click="tocOpen=false">{{ next.title }}</UButton>
              </div>
            </template>
          </USlideover>
        </div>

        <!-- Prose -->
        <UCard class="lg:col-span-9 overflow-hidden" :ui="{ body: 'p-0' }">
          <div class="border-b border-default bg-elevated/30 px-4 py-2 flex items-center justify-between gap-2">
            <span class="text-xs text-muted">Dokumen panduan</span>
            <UButton size="xs" variant="ghost" icon="i-lucide-link-2" @click="copyLink(activeSlug || headings[0]?.slug || '')">
              {{ copied ? 'Tautan disalin!' : 'Salin tautan' }}
            </UButton>
          </div>
          <!-- eslint-disable vue/no-v-html -->
          <div class="panduan-prose p-6 sm:p-8 max-w-none" v-html="renderedHtml" />
          <div class="border-t border-default p-4 flex flex-col sm:flex-row gap-2 justify-between">
            <UButton v-if="prev" :to="`/panduan/${prev.slug}`" variant="outline" icon="i-lucide-chevron-left">{{ prev.title }}</UButton>
            <span v-else />
            <UButton v-if="next" :to="`/panduan/${next.slug}`" trailing-icon="i-lucide-chevron-right" color="primary">{{ next.title }}</UButton>
          </div>
        </UCard>
      </div>
    </template>

  </div>
</template>

<style>
.panduan-prose { line-height: 1.75; color: var(--ui-text); }
.panduan-prose h1 { font-size: 1.875rem; font-weight: 800; letter-spacing: -0.02em; margin-top: 0.5rem; margin-bottom: 1rem; }
.panduan-prose h2 { font-size: 1.375rem; font-weight: 700; letter-spacing: -0.015em; margin-top: 2.5rem; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--ui-border); scroll-margin-top: 5rem; }
.panduan-prose h3 { font-size: 1.05rem; font-weight: 600; margin-top: 1.75rem; margin-bottom: 0.5rem; scroll-margin-top: 5rem; }
.panduan-prose p { margin: 0.875rem 0; font-size: 0.9375rem; }
.panduan-prose ul { list-style-type: disc; list-style-position: outside; margin: 0.75rem 0; padding-left: 1.5rem; }
.panduan-prose ol { list-style-type: decimal; list-style-position: outside; margin: 0.75rem 0; padding-left: 1.5rem; }
.panduan-prose ul ul { list-style-type: circle; }
.panduan-prose ol ul { list-style-type: disc; }
.panduan-prose li { margin: 0.35rem 0; font-size: 0.9375rem; }
.panduan-prose a { color: var(--ui-primary); text-decoration: none; }
.panduan-prose a:hover { text-decoration: underline; }
.panduan-anchor { opacity: 0; margin-left: 0.4rem; font-weight: 400; font-size: 0.9em; text-decoration: none !important; }
.panduan-prose h2:hover .panduan-anchor, .panduan-prose h3:hover .panduan-anchor { opacity: 1; }
.panduan-prose code { font-size: 0.82em; background: var(--ui-bg-elevated); padding: 0.15rem 0.35rem; border-radius: 0.35rem; border: 1px solid var(--ui-border); }
.panduan-prose pre { background: var(--ui-bg-elevated); border: 1px solid var(--ui-border); border-radius: 0.75rem; padding: 1rem; overflow-x: auto; margin: 1rem 0; }
.panduan-prose pre code { background: transparent; border: none; padding: 0; }
.panduan-prose table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; display: block; overflow-x: auto; }
.panduan-prose th, .panduan-prose td { border: 1px solid var(--ui-border); padding: 0.55rem 0.75rem; text-align: left; }
.panduan-prose th { background: var(--ui-bg-elevated); font-weight: 600; }
.panduan-prose blockquote { border-left: 3px solid var(--ui-primary); background: var(--ui-bg-elevated); margin: 1rem 0; padding: 0.75rem 1rem; border-radius: 0 0.5rem 0.5rem 0; font-size: 0.9rem; }
.panduan-prose img { max-width: 100%; height: auto; border-radius: 0.75rem; border: 1px solid var(--ui-border); margin: 1rem auto; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.panduan-prose hr { border: none; border-top: 1px solid var(--ui-border); margin: 2rem 0; }
</style>
