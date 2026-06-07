<script setup lang="ts">
import { Button } from '~/components/ui/button'

definePageMeta({ layout: 'default' })
useHead({ title: 'Applications' })

const supabase = useSupabaseClient()
const jobs = ref<any[]>([])
const loading = ref(true)

const statusConfig: Record<string, { label: string; class: string }> = {
  applied:      { label: 'Applied',    class: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  interviewing: { label: 'Interview',  class: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  offer:        { label: 'Offer',      class: 'bg-green-500/10 text-green-500 border-green-500/20' },
  rejected:     { label: 'Rejected',   class: 'bg-red-500/10 text-red-500 border-red-500/20' },
}

onMounted(async () => {
  const { data } = await supabase
    .from('jobs')
    .select('id, title, company, status, fit_score, applied_at, url')
    .in('status', ['applied', 'interviewing', 'offer', 'rejected'])
    .order('applied_at', { ascending: false })
  jobs.value = data ?? []
  loading.value = false
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Applications</h1>
      <p class="text-muted-foreground text-sm mt-1">Вакансии на которые ты откликнулся.</p>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-14 rounded-xl border bg-muted/20 animate-pulse" />
    </div>

    <div v-else-if="jobs.length === 0" class="rounded-xl border border-dashed bg-card p-12 text-center">
      <Icon name="lucide:send" class="size-10 text-muted-foreground mx-auto mb-3" />
      <p class="font-medium">Нет откликов</p>
      <p class="text-sm text-muted-foreground mt-1 mb-4">Когда поменяешь статус вакансии на "Applied" — она появится здесь.</p>
      <Button size="sm" as-child>
        <NuxtLink href="/jobs">Перейти к вакансиям</NuxtLink>
      </Button>
    </div>

    <div v-else class="rounded-xl border overflow-hidden">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/30">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Вакансия</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Статус</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Дата отклика</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Fit</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="job in jobs"
            :key="job.id"
            class="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
            @click="navigateTo(`/jobs/${job.id}`)"
          >
            <td class="px-4 py-3">
              <div class="font-medium">{{ job.title }}</div>
              <div class="text-xs text-muted-foreground">{{ job.company }}</div>
            </td>
            <td class="px-4 py-3">
              <span :class="['inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', statusConfig[job.status]?.class ?? '']">
                {{ statusConfig[job.status]?.label ?? job.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
              {{ job.applied_at ? new Date(job.applied_at).toLocaleDateString('ru') : '—' }}
            </td>
            <td class="px-4 py-3 hidden md:table-cell">
              <span v-if="job.fit_score" class="font-medium">{{ job.fit_score }}%</span>
              <span v-else class="text-muted-foreground">—</span>
            </td>
            <td class="px-4 py-3" @click.stop>
              <div class="flex gap-1">
                <Button variant="ghost" size="sm" as-child>
                  <NuxtLink :href="`/jobs/${job.id}`">Edit</NuxtLink>
                </Button>
                <Button v-if="job.url" variant="ghost" size="sm" as-child>
                  <a :href="job.url" target="_blank" rel="noopener">
                    <Icon name="lucide:external-link" class="size-4" />
                  </a>
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
