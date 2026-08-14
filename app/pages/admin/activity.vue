<script setup lang="ts">
import { h } from 'vue'
import { UBadge } from '#components'
import type { TableColumn } from '@nuxt/ui'

const { data } = await useFetch('/api/admin/activity')

const columns: TableColumn<any>[] = [
  { accessorKey: 'created_at', header: 'Waktu' },
  { accessorKey: 'user_nama', header: 'User', cell: ({ row }) => row.getValue('user_nama') || '-' },
  {
    accessorKey: 'action',
    header: 'Aksi',
    cell: ({ row }) => h(UBadge, { label: row.getValue('action'), variant: 'subtle', size: 'xs' })
  },
  { accessorKey: 'entity', header: 'Entity', cell: ({ row }) => row.getValue('entity') || '-' },
  {
    accessorKey: 'detail',
    header: 'Detail',
    cell: ({ row }) => h('span', { class: 'max-w-xs truncate text-muted' }, row.getValue('detail') || '')
  }
]
</script>

<template>
  <div>
    <h1 class="text-xl font-bold mb-4">Log Aktivitas</h1>
    <UCard>
      <UTable :data="data || []" :columns="columns" empty="Tidak ada log" />
    </UCard>
  </div>
</template>
