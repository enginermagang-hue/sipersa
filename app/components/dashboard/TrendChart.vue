<script setup lang="ts">
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line, Bar } from 'vue-chartjs'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)
const props = defineProps<{ trend: any[]; pending?: boolean }>()
const type = ref<'line'|'bar'>('line')
const chartData = computed(() => ({
  labels: (props.trend||[]).map((t:any)=>t.month),
  datasets: [
    { label:'Masuk', data:(props.trend||[]).map((t:any)=>t.masuk), borderColor:'#0ea5e9', backgroundColor:'rgba(14,165,233,0.2)', fill: type.value==='line' },
    { label:'Keluar', data:(props.trend||[]).map((t:any)=>t.keluar), borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.2)', fill: type.value==='line' }
  ]
}))
const options = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' as const } } }
</script>
<template>
  <UCard>
    <template #header><div class="flex justify-between items-center"><span class="font-semibold">Tren Surat</span><UButtonGroup size="xs"><UButton :variant="type==='line'?'solid':'outline'" @click="type='line'">Line</UButton><UButton :variant="type==='bar'?'solid':'outline'" @click="type='bar'">Bar</UButton></UButtonGroup></div></template>
    <div style="height:240px">
      <Line v-if="type==='line'" :data="chartData" :options="options" />
      <Bar v-else :data="chartData" :options="options" />
    </div>
  </UCard>
</template>
