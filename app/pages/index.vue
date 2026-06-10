<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'Dashboard' })

const supabase = useSupabaseClient()

const { data: jobs } = await useAsyncData('dashboard-jobs', async () => {
  const { data } = await supabase
    .from('jobs')
    .select('id, status, fit_score, created_at, title, company, url')
    .order('created_at', { ascending: false })
  return data ?? []
})

const all = computed(() => jobs.value ?? [])

const stats = computed(() => {
  const scored = all.value.filter(j => j.fit_score != null)
  const avgFit = scored.length
    ? Math.round(scored.reduce((s, j) => s + (j.fit_score ?? 0), 0) / scored.length)
    : null
  const thisWeek = all.value.filter(j => {
    const d = new Date(j.created_at)
    const now = new Date()
    return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
  }).length

  return [
    { label: 'Total',       value: String(all.value.length),                                  icon: 'lucide:briefcase' },
    { label: 'This week',   value: String(thisWeek),                                           icon: 'lucide:calendar-plus' },
    { label: 'Applied',     value: String(all.value.filter(j => ['applied','interviewing','offer'].includes(j.status)).length), icon: 'lucide:send' },
    { label: 'Avg fit',     value: avgFit != null ? `${avgFit}%` : '—',                       icon: 'lucide:target' },
  ]
})

const FUNNEL: { key: string; label: string; color: string }[] = [
  { key: 'new',          label: 'New',        color: 'bg-blue-500' },
  { key: 'reviewing',    label: 'Reviewing',  color: 'bg-yellow-500' },
  { key: 'applied',      label: 'Applied',    color: 'bg-purple-500' },
  { key: 'interviewing', label: 'Interview',  color: 'bg-orange-500' },
  { key: 'offer',        label: 'Offer',      color: 'bg-green-500' },
]

const funnelCounts = computed(() =>
  FUNNEL.map(f => ({ ...f, count: all.value.filter(j => j.status === f.key).length }))
)

const topJobs = computed(() =>
  [...all.value]
    .filter(j => j.fit_score != null && j.status === 'new')
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
    .slice(0, 5)
)

function scoreClass(s: number | null) {
  if (!s) return 'text-muted-foreground'
  if (s >= 70) return 'text-green-400 font-semibold'
  if (s >= 40) return 'text-yellow-400'
  return 'text-red-400/70'
}

const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
</script>

<template>
  <div class="space-y-6">

    <div>
      <h1 class="text-2xl font-bold tracking-tight">{{ greeting }} 👋</h1>
      <p class="text-muted-foreground text-sm mt-1">Here's your job search overview.</p>
    </div>

    <!-- Stat cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="rounded-xl border bg-card p-4 flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">{{ stat.label }}</span>
          <Icon :name="stat.icon" class="size-4 text-muted-foreground" />
        </div>
        <span class="text-3xl font-bold tabular-nums">{{ stat.value }}</span>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">

      <!-- Application funnel -->
      <div class="rounded-xl border bg-card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm">Application Funnel</h2>
          <NuxtLink href="/jobs" class="text-xs text-muted-foreground underline underline-offset-2">View all</NuxtLink>
        </div>
        <div class="space-y-2.5">
          <div v-for="stage in funnelCounts" :key="stage.key" class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-16 shrink-0">{{ stage.label }}</span>
            <div class="flex-1 bg-muted/40 rounded-full h-2 overflow-hidden">
              <div
                :class="['h-full rounded-full transition-all', stage.color]"
                :style="{ width: all.length ? `${Math.max(4, Math.round(stage.count / all.length * 100))}%` : '0%' }"
              />
            </div>
            <span class="text-xs font-medium tabular-nums w-6 text-right">{{ stage.count }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
          <span>Rejected: {{ all.filter(j => j.status === 'rejected').length }}</span>
          <span class="text-border">·</span>
          <span>Archived: {{ all.filter(j => j.status === 'archived').length }}</span>
        </div>
      </div>

      <!-- Top new jobs by score -->
      <div class="rounded-xl border bg-card p-5 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm">Top Matches</h2>
          <NuxtLink href="/jobs?status=new" class="text-xs text-muted-foreground underline underline-offset-2">All new</NuxtLink>
        </div>
        <div v-if="topJobs.length === 0" class="text-sm text-muted-foreground py-2">
          No new scored jobs yet.
        </div>
        <div v-else class="space-y-2.5">
          <NuxtLink
            v-for="job in topJobs"
            :key="job.id"
            :href="`/jobs/${job.id}`"
            class="flex items-center justify-between group"
          >
            <div class="min-w-0">
              <div class="text-sm font-medium leading-tight truncate group-hover:underline underline-offset-2">{{ job.title }}</div>
              <div class="text-xs text-muted-foreground">{{ job.company }}</div>
            </div>
            <span :class="['text-sm tabular-nums shrink-0 ml-3', scoreClass(job.fit_score)]">
              {{ job.fit_score }}%
            </span>
          </NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>
