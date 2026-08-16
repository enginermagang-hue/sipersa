<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const id = route.params.id as string

const { data, pending } = await useFetch(`/api/surat-masuk/${id}`, {
  key: `cetak-disposisi-${id}`
})

onMounted(() => {
  nextTick(() => {
    setTimeout(() => window.print(), 500)
  })
})
</script>

<template>
  <div v-if="data && !pending" class="cetak-page">
    <LembarDisposisi :surat="data.surat" :disposisi="data.disposisi" />
  </div>
  <div v-else class="cetak-loading">
    <p>Memuat data lembar disposisi…</p>
  </div>
</template>

<style>
@import "~/assets/css/main.css";

* {
  box-sizing: border-box;
}

.cetak-page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 18mm 18mm 15mm;
  background: white;
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  color: #000;
}

.cetak-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
</style>