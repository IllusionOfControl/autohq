<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { JOB_STATUS, PIPELINE, BOARD_COLUMNS, scoreColor, type JobStatus } from '~/composables/useJobStatus'

definePageMeta({ layout: 'default' })
useHead({ title: 'Jobs' })

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  remote: boolean
  status: JobStatus
  fit_score: number | null
  created_at: string
  applied_at: string | null
  url: string | null
}

const supabase = useSupabaseClient()
const view = useStorage<'board' | 'table'>('autohq:jobs-view', 'board')
const search = ref('')
const statusFilter = ref<'all' | JobStatus>('all')
const sortBy = ref<'score' | 'date'>('score')
const jobs = ref<Job[]>([])
const loading = ref(true)

const counts = computed(() => {
  const result: Record<string, number> = { all: jobs.value.length }
  for (const key of PIPELINE) result[key] = jobs.value.filter(j => j.status === key).length
  result.archived = jobs.value.filter(j => j.status === 'archived').length
  return result
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  let list = jobs.value.filter(j => {
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
    const matchStatus = statusFilter.value === 'all' || j.status === statusFilter.value
    return matchSearch && matchStatus
  })
  if (sortBy.value === 'score') list = [...list].sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1))
  return list
})

/** jobs grouped per board column, honoring the search box */
const board = computed(() => {
  const q = search.value.toLowerCase()
  const visible = jobs.value.filter(j => !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q))
  return BOARD_COLUMNS.map(status => ({
    status,
    ...JOB_STATUS[status],
    items: visible
      .filter(j => j.status === status)
      .sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1)),
  }))
})

async function fetchJobs() {
  loading.value = true
  const { data } = await supabase
    .from('jobs')
    .select('id, title, company, location, remote, status, fit_score, created_at, applied_at, url')
    .order('created_at', { ascending: false })
  jobs.value = (data as Job[]) ?? []
  loading.value = false
}

// ── Drag & drop ──────────────────────────────
const draggingId = ref<string | null>(null)
const dragOverCol = ref<JobStatus | null>(null)

function onDragStart(job: Job) {
  draggingId.value = job.id
}
function onDragEnd() {
  draggingId.value = null
  dragOverCol.value = null
}
async function onDrop(status: JobStatus) {
  const id = draggingId.value
  dragOverCol.value = null
  draggingId.value = null
  if (!id) return
  const job = jobs.value.find(j => j.id === id)
  if (!job || job.status === status) return

  const prev = job.status
  job.status = status // optimistic
  const patch: Record<string, unknown> = { status }
  if (status === 'applied' && !job.applied_at) {
    job.applied_at = new Date().toISOString()
    patch.applied_at = job.applied_at
  }
  const { error } = await supabase.from('jobs').update(patch).eq('id', id)
  if (error) job.status = prev // rollback
}

onMounted(fetchJobs)
</script>

<template>
  <div class="space-y-4">

    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Job Tracker</h1>
        <p class="text-muted-foreground text-sm mt-0.5">{{ jobs.length }} jobs tracked</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- View toggle -->
        <div class="inline-flex rounded-lg border bg-card p-0.5">
          <button
            v-for="v in (['board','table'] as const)"
            :key="v"
            @click="view = v"
            :class="[
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              view === v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            ]"
          >
            <Icon :name="v === 'board' ? 'lucide:kanban' : 'lucide:table-2'" class="size-3.5" />
            {{ v === 'board' ? 'Board' : 'Table' }}
          </button>
        </div>
        <Button size="sm" as-child>
          <NuxtLink href="/jobs/new">
            <Icon name="lucide:plus" class="size-4 mr-1" />
            Add Job
          </NuxtLink>
        </Button>
      </div>
    </div>

    <!-- Search + (table-only) filters -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <Icon name="lucide:search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input v-model="search" placeholder="Search title or company…" class="pl-8" />
      </div>

      <template v-if="view === 'table'">
        <button
          @click="statusFilter = 'all'"
          :class="['px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
            statusFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground']"
        >
          All <span class="ml-1 tabular-nums opacity-70">{{ counts.all }}</span>
        </button>
        <button
          v-for="s in PIPELINE"
          :key="s"
          @click="statusFilter = statusFilter === s ? 'all' : s"
          :class="['px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
            statusFilter === s ? JOB_STATUS[s].chip : 'border-border text-muted-foreground hover:text-foreground']"
        >
          {{ JOB_STATUS[s].label }} <span class="ml-1 tabular-nums opacity-70">{{ counts[s] }}</span>
        </button>
        <button
          @click="sortBy = sortBy === 'score' ? 'date' : 'score'"
          class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
        >
          <Icon :name="sortBy === 'score' ? 'lucide:target' : 'lucide:clock'" class="size-3.5" />
          {{ sortBy === 'score' ? 'By score' : 'By date' }}
        </button>
      </template>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div v-for="i in 5" :key="i" class="h-40 rounded-xl border bg-muted/20 animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="jobs.length === 0" class="surface border-dashed p-12 text-center">
      <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon name="lucide:briefcase" class="size-6" />
      </div>
      <p class="font-medium">No jobs yet</p>
      <p class="text-sm text-muted-foreground mt-1 mb-4">n8n will auto-import jobs every morning. Or add one manually.</p>
      <Button size="sm" as-child>
        <NuxtLink href="/jobs/new">Add your first job</NuxtLink>
      </Button>
    </div>

    <!-- ── BOARD VIEW ─────────────────────────── -->
    <div v-else-if="view === 'board'" class="-mx-1 overflow-x-auto pb-2">
      <div class="flex gap-3 px-1 min-w-max">
        <div
          v-for="col in board"
          :key="col.status"
          class="flex w-72 shrink-0 flex-col rounded-xl border bg-card/40 transition-colors"
          :class="dragOverCol === col.status ? 'border-primary/60 bg-primary/5' : 'border-border'"
          @dragover.prevent="dragOverCol = col.status"
          @dragleave="dragOverCol === col.status && (dragOverCol = null)"
          @drop="onDrop(col.status)"
        >
          <!-- Column header -->
          <div class="flex items-center justify-between px-3 py-2.5 border-b">
            <span class="flex items-center gap-2 text-sm font-medium">
              <span :class="['size-2 rounded-full', col.dot]" />
              {{ col.label }}
            </span>
            <span class="text-xs font-semibold tabular-nums text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
              {{ col.items.length }}
            </span>
          </div>

          <!-- Cards -->
          <div class="flex-1 space-y-2 p-2 min-h-24">
            <div
              v-for="job in col.items"
              :key="job.id"
              draggable="true"
              @dragstart="onDragStart(job)"
              @dragend="onDragEnd"
              @click="navigateTo(`/jobs/${job.id}`)"
              :class="['group cursor-grab active:cursor-grabbing rounded-lg border bg-card p-3 transition-all hover:border-primary/40',
                draggingId === job.id ? 'opacity-40 ring-1 ring-primary' : '']"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">{{ job.title }}</p>
                <span
                  v-if="job.fit_score != null"
                  :class="['shrink-0 text-xs font-bold tabular-nums rounded-md px-1.5 py-0.5 bg-muted/60', scoreColor(job.fit_score)]"
                >{{ job.fit_score }}</span>
              </div>
              <p class="mt-1 text-xs text-muted-foreground truncate">{{ job.company }}</p>
              <div class="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span class="flex items-center gap-1 truncate">
                  <Icon :name="job.remote ? 'lucide:globe' : 'lucide:map-pin'" class="size-3 shrink-0" />
                  {{ job.remote ? 'Remote' : (job.location || '—') }}
                </span>
              </div>
            </div>

            <p v-if="col.items.length === 0" class="text-center text-xs text-muted-foreground/60 py-6">
              Drop here
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TABLE VIEW ─────────────────────────── -->
    <div v-else-if="filtered.length === 0" class="surface border-dashed p-12 text-center">
      <Icon name="lucide:search-x" class="size-8 text-muted-foreground mx-auto mb-3" />
      <p class="font-medium">No matches</p>
      <p class="text-sm text-muted-foreground mt-1">Try adjusting your search or filters.</p>
    </div>

    <div v-else class="surface overflow-hidden">
      <table class="w-full text-sm">
        <thead class="border-b bg-muted/30 text-xs uppercase tracking-wide">
          <tr>
            <th class="text-left px-4 py-2.5 font-medium text-muted-foreground">Position</th>
            <th class="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Location</th>
            <th class="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
            <th class="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Fit</th>
            <th class="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Added</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="job in filtered"
            :key="job.id"
            class="border-b last:border-0 hover:bg-accent/50 transition-colors cursor-pointer"
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
              <span :class="['inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium', JOB_STATUS[job.status].badge]">
                <span :class="['size-1.5 rounded-full', JOB_STATUS[job.status].dot]" />
                {{ JOB_STATUS[job.status].label }}
              </span>
            </td>
            <td class="px-4 py-3 hidden sm:table-cell">
              <span :class="['tabular-nums text-sm font-medium', scoreColor(job.fit_score)]">
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

    <p v-if="view === 'board' && jobs.length" class="text-xs text-muted-foreground flex items-center gap-1.5">
      <Icon name="lucide:move" class="size-3.5" />
      Drag cards between columns to change status.
    </p>

  </div>
</template>
