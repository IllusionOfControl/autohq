<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { JOB_STATUS, scoreColor, type JobStatus } from '~/composables/useJobStatus'

definePageMeta({ layout: 'default' })
useHead({ title: 'Applications' })

const jobs = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  const data = await $fetch<any[]>('/api/jobs', {
    query: { status: 'applied,interviewing,offer,rejected' },
  })
  jobs.value = [...data].sort((a, b) =>
    (b.applied_at ? Date.parse(b.applied_at) : 0) - (a.applied_at ? Date.parse(a.applied_at) : 0),
  )
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

    <div v-else-if="jobs.length === 0" class="surface border-dashed p-12 text-center">
      <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon name="lucide:send" class="size-6" />
      </div>
      <p class="font-medium">Нет откликов</p>
      <p class="text-sm text-muted-foreground mt-1 mb-4">Когда поменяешь статус вакансии на «Applied» — она появится здесь.</p>
      <Button size="sm" as-child>
        <NuxtLink href="/jobs">Перейти к вакансиям</NuxtLink>
      </Button>
    </div>

    <div v-else class="surface overflow-hidden">
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
              <span :class="['inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium', JOB_STATUS[job.status as JobStatus]?.badge ?? '']">
                <span :class="['size-1.5 rounded-full', JOB_STATUS[job.status as JobStatus]?.dot ?? 'bg-muted']" />
                {{ JOB_STATUS[job.status as JobStatus]?.label ?? job.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
              {{ job.applied_at ? new Date(job.applied_at).toLocaleDateString('ru') : '—' }}
            </td>
            <td class="px-4 py-3 hidden md:table-cell">
              <span v-if="job.fit_score" :class="['font-medium tabular-nums', scoreColor(job.fit_score)]">{{ job.fit_score }}%</span>
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
