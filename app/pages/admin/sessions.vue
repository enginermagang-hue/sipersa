<script setup lang="ts">
import { h } from 'vue'
import { UBadge, UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'

const { data, refresh } = await useFetch('/api/admin/sessions')

const { confirm } = useConfirm()
async function revoke(id: string) {
  const ok = await confirm({ title: 'Putus Sesi', message: 'Putus sesi ini (force logout)?', okLabel: 'Putus' })
  if (!ok) return
  await $fetch(`/api/admin/sessions/${id}`, { method: 'DELETE' })
  await refresh()
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'nama',
    header: 'User',
    cell: ({ row }) => h('span', null, [
      row.getValue('nama'),
      ' ',
      h('span', { class: 'text-muted' }, `(${row.original.username})`)
    ])
  },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'ip_address', header: 'IP' },
  {
    accessorKey: 'user_agent',
    header: 'User Agent',
    cell: ({ row }) => h('span', { class: 'max-w-xs truncate block' }, row.getValue('user_agent'))
  },
  { accessorKey: 'last_active', header: 'Last Active' },
  {
    accessorKey: 'revoked',
    header: 'Status',
    cell: ({ row }) => row.original.revoked
      ? h(UBadge, { label: 'Revoked', color: 'error', variant: 'subtle', size: 'xs' })
      : h(UBadge, { label: 'Aktif', color: 'success', variant: 'subtle', size: 'xs' })
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { td: 'text-right' } },
    cell: ({ row }) => row.original.revoked
      ? null
      : h(UButton, { size: 'xs', variant: 'ghost', color: 'error', icon: 'i-lucide-ban', onClick: () => revoke(row.original.id) }, () => 'Revoke')
  }
]
</script>

<template>
  <div>
    <h1 class="text-xl font-bold mb-4">Session Manager</h1>
    <UCard>
      <UTable :data="data || []" :columns="columns" empty="Tidak ada sesi" />
    </UCard>
  </div>
</template>
