<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

definePageMeta({ layout: 'default' })
useHead({ title: 'Jobs' })

type JobStatus = 'new' | 'reviewing' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived'

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  remote: boolean
  status: JobStatus
  fit_score: number | null
  created_at: string
  url: string | null
}

const statusConfig: Record<JobStatus, { label: string; badge: string; chip: string }> = {
  new:          { label: 'New',       badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     chip: 'bg-blue-500/15 border-blue-500 text-blue-400' },
  reviewing:    { label: 'Reviewing', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', chip: 'bg-yellow-500/15 border-yellow-500 text-yellow-400' },
  applied:      { label: 'Applied',   badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', chip: 'bg-purple-500/15 border-purple-500 text-purple-400' },
  interviewing: { label: 'Interview', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', chip: 'bg-orange-500/15 border-orange-500 text-orange-400' },
  offer:        { label: 'Offer',     badge: 'bg-green-500/10 text-green-400 border-green-500/20',   chip: 'bg-green-500/15 border-green-500 text-green-400' },
  rejected:     { label: 'Rejected',  badge: 'bg-red-500/10 text-red-400 border-red-500/20',         chip: 'bg-red-500/15 border-red-500 text-red-400' },
  archived:     { label: 'Archived',  badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20',      chip: 'bg-gray-500/15 border-gray-500 text-gray-400' },
}

const PIPELINE_STATUSES: JobStatus[] = ['new', 'applied', 'interviewing', 'offer']

function scoreClass(score: number | null) {
  if (!score) return 'text-muted-foreground'
  if (score >= 70) return 'text-green-400 font-semibold'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400/70'
}

const supabase = useSupabaseClient()
const search = ref('')
const statusFilter = ref('all')
const sortBy = ref<'score' | 'date'>('score')
const jobs = ref<Job[]>([])
const loading = ref(true)

const counts = computed(() => {
  const all = jobs.value
  const result: Record<string, number> = { all: all.length }
  for (const key of Object.keys(statusConfig) as JobStatus[]) {
    result[key] = all.filter(j => j.status === key).length
  }
  return result
})

const filtered = computed(() => {
  let list = jobs.value.filter(j => {
    const q = search.value.toLowerCase()
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
    const matchStatus = statusFilter.value === 'all' || j.status === statusFilter.value
    return matchSearch && matchStatus
  })
  if (sortBy.value === 'score') {
    list = [...list].sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1))
  }
  return list
})

async function fetchJobs() {
  loading.value = true
  const { data } = await supabase
    .from('jobs')
    .select('id, title, company, location, remote, status, fit_score, created_at, url')
    .order('created_at', { ascending: false })
  jobs.value = (data as Job[]) ?? []
  loading.value = false
}

onMounted(fetchJobs)
</script>

<template>
  <div class="space-y-4">

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Job Tracker</h1>
        <p class="text-muted-foreground text-sm mt-0.5">{{ jobs.length }} jobs tracked</p>
      </div>
      <Button size="sm" as-child>
        <NuxtLink href="/jobs/new">
          <Icon name="lucide:plus" class="size-4 mr-1" />
          Add Job
        </NuxtLink>
      </Button>
    </div>

    <!-- Pipeline filter chips -->
    <div class="flex flex-wrap gap-2">
      <button
        @click="statusFilter = 'all'"
        :class="[
          'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
          statusFilter === 'all'
            ? 'bg-foreground text-background border-foreground'
            : 'border-border text-muted-foreground hover:text-foreground'
        ]"
      >
        All <span class="ml-1 tabular-nums opacity-70">{{ counts.all }}</span>
      </button>
      <button
        v-for="s in PIPELINE_STATUSES"
        :key="s"
        @click="statusFilter = statusFilter === s ? 'all' : s"
        :class="[
          'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
          statusFilter === s ? statusConfig[s].chip : 'border-border text-muted-foreground hover:text-foreground'
        ]"
      >
        {{ statusConfig[s].label }} <span class="ml-1 tabular-nums opacity-70">{{ counts[s] }}</span>
      </button>
      <!-- Rejected/Archived as smaller chip -->
      <button
        v-for="s in (['rejected', 'archived'] as JobStatus[])"
        :key="s"
        @click="statusFilter = statusFilter === s ? 'all' : s"
        :class="[
          'px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
          statusFilter === s ? statusConfig[s].chip : 'border-border text-muted-foreground/60 hover:text-muted-foreground'
        ]"
      >
        {{ statusConfig[s].label }} {{ counts[s] }}
      </button>
    </div>

    <!-- Search + sort -->
    <div class="flex gap-2">
      <Input v-model="search" placeholder="Search jobs..." class="max-w-xs" />
      <button
        @click="sortBy = sortBy === 'score' ? 'date' : 'score'"
        :class="[
          'flex items-center gap-1.5 px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap',
          sortBy === 'score' ? 'border-foreground/60 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
        ]"
      >
        <Icon :name="sortBy === 'score' ? 'lucide:target' : 'lucide:clock'" class="size-3.5" />
        {{ sortBy === 'score' ? 'By score' : 'By date' }}
      </button>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-14 rounded-xl border bg-muted/20 animate-pulse" />
    </div>

    <div v-else-if="filtered.length === 0" class="rounded-xl border border-dashed bg-card p-12 text-center">
      <Icon name="lucide:briefcase" class="size-10 text-muted-foreground mx-auto mb-3" />
      <p class="font-medium">{{ jobs.length === 0 ? 'No jobs yet' : 'No matches' }}</p>
      <p class="text-sm text-muted-foreground mt-1 mb-4">
        {{ jobs.length === 0 ? 'n8n will auto-import jobs. Or add one manually.' : 'Try adjusting your filters.' }}
      </p>
      <Button v-if="jobs.length === 0" size="sm" as-child>
        <NuxtLink href="/jobs/new">Add job</NuxtLink>
      </Button>
    </div>

    <div v-else class="rounded-xl border overflow-hidden">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/30">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Position</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Location</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Fit</th>
            <th class="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Added</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="job in filtered"
            :key="job.id"
            class="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
            @click="navigateTo(`/jobs/${job.id}`)"
          >
            <td class="px-4 py-3">
              <div class="font-medium leading-tight">{{ job.title }}</div>
              <div class="text-muted-foreground text-xs mt-0.5">{{ job.company }}</div>
            </td>
            <td class="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
              {{ job.remote ? '🌍 Remote' : (job.location ?? '—') }}
            </td>
            <td class="px-4 py-3">
              <span :class="['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', statusConfig[job.status].badge]">
                {{ statusConfig[job.status].label }}
              </span>
            </td>
            <td class="px-4 py-3 hidden sm:table-cell">
              <span :class="['tabular-nums text-sm', scoreClass(job.fit_score)]">
                {{ job.fit_score != null ? job.fit_score + '%' : '—' }}
              </span>
            </td>
            <td class="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
              {{ new Date(job.created_at).toLocaleDateString() }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>
