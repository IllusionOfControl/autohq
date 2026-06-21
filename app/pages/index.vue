<script setup lang="ts">
import { JOB_STATUS, PIPELINE, APPLIED_STATUSES, scoreColor, type JobStatus } from '~/composables/useJobStatus'

definePageMeta({ layout: 'default' })
useHead({ title: 'Dashboard' })

const { data: jobs } = await useAsyncData('dashboard-jobs', () =>
  $fetch('/api/jobs'),
)

const all = computed(() => jobs.value ?? [])

const stats = computed(() => {
  const scored = all.value.filter(j => j.fit_score != null)
  const avgFit = scored.length
    ? Math.round(scored.reduce((s, j) => s + (j.fit_score ?? 0), 0) / scored.length)
    : null
  const thisWeek = all.value.filter(j => {
    const d = new Date(j.created_at)
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
  }).length

  return [
    { label: 'Total jobs', value: String(all.value.length), icon: 'lucide:briefcase', hint: 'in the pipeline' },
    { label: 'This week',  value: String(thisWeek), icon: 'lucide:calendar-plus', hint: 'newly imported' },
    { label: 'Applied',    value: String(all.value.filter(j => APPLIED_STATUSES.includes(j.status as JobStatus)).length), icon: 'lucide:send', hint: 'sent out' },
    { label: 'Avg fit',    value: avgFit != null ? `${avgFit}%` : '—', icon: 'lucide:target', hint: 'AI match score' },
  ]
})

const funnelCounts = computed(() =>
  PIPELINE.filter(s => s !== 'rejected').map(s => ({
    key: s,
    ...JOB_STATUS[s],
    count: all.value.filter(j => j.status === s).length,
  }))
)

const maxFunnel = computed(() => Math.max(1, ...funnelCounts.value.map(f => f.count)))

const topJobs = computed(() =>
  [...all.value]
    .filter(j => j.fit_score != null && j.status === 'new')
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
    .slice(0, 5)
)

const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
const today = new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })
</script>

<template>
  <div class="space-y-6">

    <!-- Hero -->
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ greeting }} <span class="inline-block">👋</span></h1>
        <p class="text-muted-foreground text-sm mt-1">{{ today }} · here's your job search at a glance.</p>
      </div>
      <Button as-child class="hidden sm:inline-flex">
        <NuxtLink href="/jobs">
          <Icon name="lucide:list-checks" class="size-4 mr-1.5" />
          Open tracker
        </NuxtLink>
      </Button>
    </div>

    <!-- Stat cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="surface-interactive relative overflow-hidden p-4"
      >
        <div class="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-primary/10 blur-2xl" />
        <div class="relative flex items-start justify-between">
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">{{ stat.label }}</span>
          <div class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon :name="stat.icon" class="size-4" />
          </div>
        </div>
        <div class="relative mt-3 text-3xl font-bold tabular-nums">{{ stat.value }}</div>
        <div class="relative mt-0.5 text-xs text-muted-foreground">{{ stat.hint }}</div>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-5">

      <!-- Application funnel -->
      <div class="surface p-5 space-y-4 lg:col-span-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm flex items-center gap-2">
            <Icon name="lucide:filter" class="size-4 text-muted-foreground" />
            Application Funnel
          </h2>
          <NuxtLink href="/jobs" class="text-xs text-muted-foreground hover:text-foreground transition-colors">View all →</NuxtLink>
        </div>
        <div class="space-y-3">
          <div v-for="stage in funnelCounts" :key="stage.key" class="flex items-center gap-3">
            <span class="flex items-center gap-1.5 text-xs text-muted-foreground w-20 shrink-0">
              <span :class="['size-1.5 rounded-full', stage.dot]" />
              {{ stage.label }}
            </span>
            <div class="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden">
              <div
                :class="['h-full rounded-full transition-all duration-500', stage.dot]"
                :style="{ width: `${Math.max(stage.count ? 6 : 0, Math.round(stage.count / maxFunnel * 100))}%` }"
              />
            </div>
            <span class="text-xs font-semibold tabular-nums w-6 text-right">{{ stage.count }}</span>
          </div>
        </div>
        <div class="flex items-center gap-3 text-xs text-muted-foreground pt-3 border-t">
          <span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-rose-400/70" />Rejected: {{ all.filter(j => j.status === 'rejected').length }}</span>
          <span class="text-border">·</span>
          <span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-zinc-500" />Archived: {{ all.filter(j => j.status === 'archived').length }}</span>
        </div>
      </div>

      <!-- Top new jobs by score -->
      <div class="surface p-5 space-y-3 lg:col-span-2">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm flex items-center gap-2">
            <Icon name="lucide:flame" class="size-4 text-primary" />
            Top Matches
          </h2>
          <NuxtLink href="/jobs?status=new" class="text-xs text-muted-foreground hover:text-foreground transition-colors">All new →</NuxtLink>
        </div>
        <div v-if="topJobs.length === 0" class="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
          <Icon name="lucide:inbox" class="size-7 mb-2 opacity-60" />
          <p class="text-sm">No new scored jobs yet.</p>
        </div>
        <div v-else class="space-y-1">
          <NuxtLink
            v-for="job in topJobs"
            :key="job.id"
            :href="`/jobs/${job.id}`"
            class="flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg hover:bg-accent/60 transition-colors group"
          >
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium leading-tight truncate group-hover:text-primary transition-colors">{{ job.title }}</div>
              <div class="text-xs text-muted-foreground truncate">{{ job.company }}</div>
            </div>
            <span :class="['text-sm font-semibold tabular-nums shrink-0', scoreColor(job.fit_score)]">
              {{ job.fit_score }}%
            </span>
          </NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>
