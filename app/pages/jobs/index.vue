<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '~/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '~/components/ui/dialog'
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
  source: string | null
}

const config = useRuntimeConfig()
const view = useStorage<'board' | 'table'>('autohq:jobs-view', 'board')
const search = ref('')
const statusFilter = ref<'all' | JobStatus>('all')
const sourceFilter = ref<'all' | string>('all')
const sortBy = ref<'score' | 'date'>('score')
const jobs = ref<Job[]>([])
const loading = ref(true)

const SOURCE_LABELS: Record<string, string> = {
  remotive: 'Remotive',
  arbeitnow: 'Arbeitnow',
  habr: 'Habr Career',
  hh: 'HH.ru',
  djinni: 'Djinni',
  unknown: 'Other',
}
function sourceLabel(s: string | null): string {
  if (!s) return 'Other'
  return SOURCE_LABELS[s] ?? s
}

/** distinct sources present in the data, with counts, most common first */
const sources = computed(() => {
  const map = new Map<string, number>()
  for (const j of jobs.value) {
    const s = j.source ?? 'unknown'
    map.set(s, (map.get(s) ?? 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
})

const counts = computed(() => {
  const result: Record<string, number> = { all: jobs.value.length }
  for (const key of PIPELINE) result[key] = jobs.value.filter(j => j.status === key).length
  result.archived = jobs.value.filter(j => j.status === 'archived').length
  return result
})

function matchSource(j: Job) {
  return sourceFilter.value === 'all' || (j.source ?? 'unknown') === sourceFilter.value
}

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  let list = jobs.value.filter(j => {
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
    const matchStatus = statusFilter.value === 'all' || j.status === statusFilter.value
    return matchSearch && matchStatus && matchSource(j)
  })
  if (sortBy.value === 'score') list = [...list].sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1))
  return list
})

/** jobs grouped per board column, honoring the search box + source filter */
const board = computed(() => {
  const q = search.value.toLowerCase()
  const visible = jobs.value.filter(j =>
    (!q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)) && matchSource(j))
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

  // Образцы для разработки/демо без подключения к БД. Включается флагом
  // NUXT_PUBLIC_USE_SAMPLE_DATA=true (см. nuxt.config.ts → runtimeConfig.public).
  if (config.public.useSampleData && jobs.value.length === 0) {
    const now = Date.now()
    const ago = (ms: number) => new Date(now - ms).toISOString()
    jobs.value = [
      { id: 'dev-1', title: 'Senior Vue Developer', company: 'Acme', location: 'Remote', remote: true, status: 'new', fit_score: 88, created_at: ago(20_000), applied_at: null, url: '#', source: 'hh' },
      { id: 'dev-2', title: 'Frontend Engineer (Nuxt)', company: 'Globex', location: 'Berlin', remote: true, status: 'reviewing', fit_score: 74, created_at: ago(5 * 60_000), applied_at: null, url: '#', source: 'remotive' },
      { id: 'dev-3', title: 'TypeScript Developer', company: 'Initech', location: 'Remote', remote: true, status: 'applied', fit_score: 61, created_at: ago(3 * 3_600_000), applied_at: ago(60_000), url: '#', source: 'djinni' },
      { id: 'dev-4', title: 'Vue.js Engineer', company: 'Umbrella', location: 'Москва', remote: true, status: 'new', fit_score: 45, created_at: ago(2 * 86_400_000), applied_at: null, url: '#', source: 'habr' },
      { id: 'dev-5', title: 'Full-Stack Developer', company: 'Hooli', location: 'Remote', remote: true, status: 'interviewing', fit_score: 92, created_at: ago(10 * 86_400_000), applied_at: ago(86_400_000), url: '#', source: 'arbeitnow' },
    ]
  } else {
    jobs.value = await $fetch<Job[]>('/api/jobs')
  }
  loading.value = false
}

// ── Selection (table view) ───────────────────
const selected = ref<Set<string>>(new Set())
const selectionCount = computed(() => selected.value.size)

function toggleOne(id: string) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}
const allVisibleSelected = computed(() =>
  filtered.value.length > 0 && filtered.value.every(j => selected.value.has(j.id)))
function toggleAll() {
  const s = new Set(selected.value)
  if (allVisibleSelected.value) filtered.value.forEach(j => s.delete(j.id))
  else filtered.value.forEach(j => s.add(j.id))
  selected.value = s
}
function clearSelection() {
  selected.value = new Set()
}

// ── Delete (single + bulk) ───────────────────
const confirmOpen = ref(false)
const pendingDelete = ref<string[]>([])
const deleting = ref(false)

function askDelete(ids: string[]) {
  if (!ids.length) return
  pendingDelete.value = ids
  confirmOpen.value = true
}
async function doDelete() {
  const ids = pendingDelete.value
  if (!ids.length) return
  deleting.value = true
  const prev = jobs.value
  jobs.value = jobs.value.filter(j => !ids.includes(j.id)) // optimistic
  const s = new Set(selected.value)
  ids.forEach(i => s.delete(i))
  selected.value = s
  try {
    await $fetch('/api/jobs/bulk', { method: 'DELETE', body: { ids } })
  } catch (e: any) {
    jobs.value = prev // rollback
    alert('Delete failed: ' + (e?.data?.message ?? e?.message ?? 'unknown error'))
  } finally {
    deleting.value = false
    confirmOpen.value = false
    pendingDelete.value = []
  }
}

// ── Bulk status change ───────────────────────
async function bulkStatus(status: JobStatus) {
  const ids = [...selected.value]
  if (!ids.length) return
  const prev = jobs.value.map(j => ({ id: j.id, status: j.status, applied_at: j.applied_at }))
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status }
  if (status === 'applied') patch.applied_at = now
  jobs.value.forEach(j => {
    if (ids.includes(j.id)) {
      j.status = status
      if (status === 'applied' && !j.applied_at) j.applied_at = now
    }
  })
  try {
    await $fetch('/api/jobs/bulk', { method: 'PATCH', body: { ids, patch } })
    clearSelection()
  } catch (e: any) {
    // rollback
    const map = new Map(prev.map(p => [p.id, p]))
    jobs.value.forEach(j => {
      const p = map.get(j.id)
      if (p) { j.status = p.status as JobStatus; j.applied_at = p.applied_at }
    })
    alert('Update failed: ' + (e?.data?.message ?? e?.message ?? 'unknown error'))
  }
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
  try {
    await $fetch(`/api/jobs/${id}`, { method: 'PATCH', body: patch })
  } catch {
    job.status = prev // rollback
  }
}
const now = ref(Date.now())

function formatTimeRelative(jobCreateTime: string): string {
  if(!jobCreateTime) return 'unknown'
  const sAgo = (now.value - Date.parse(jobCreateTime) ) / 1000
  if (sAgo < 60) return 'just now'
  if (sAgo < 3600) return `${Math.floor(sAgo / 60)} min ago`
  if (sAgo < 86400) return `${Math.floor(sAgo / 3600)} h ago`
  if (sAgo < 604800) return `${Math.floor(sAgo / 86400)} d ago`
  return new Date(Date.parse(jobCreateTime)).toLocaleString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

let refreshJobAddedTimer: ReturnType<typeof setInterval>

function refreshJobAddedTime(){
  refreshJobAddedTimer = setInterval( () => {
    now.value = Date.now()
  }, 20000)
}


onMounted(()=>{
  fetchJobs()
  refreshJobAddedTime()
})
onBeforeUnmount(() => {
  clearInterval(refreshJobAddedTimer)
})
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

    <!-- Search + source filter + (table-only) status filters -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <Icon name="lucide:search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input v-model="search" placeholder="Search title or company…" class="pl-8" />
      </div>

      <!-- Source filter (both views) -->
      <Select v-model="sourceFilter">
        <SelectTrigger class="w-[170px]">
          <span class="flex items-center gap-1.5">
            <Icon name="lucide:rss" class="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="All sources" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources ({{ jobs.length }})</SelectItem>
          <SelectItem v-for="[s, c] in sources" :key="s" :value="s">
            {{ sourceLabel(s === 'unknown' ? null : s) }} ({{ c }})
          </SelectItem>
        </SelectContent>
      </Select>

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

    <!-- Bulk action bar (table view, when rows selected) -->
    <div
      v-if="view === 'table' && selectionCount > 0"
      class="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2"
    >
      <span class="text-sm font-medium">{{ selectionCount }} selected</span>
      <span class="text-muted-foreground text-xs">·</span>
      <Button size="sm" variant="destructive" @click="askDelete([...selected])">
        <Icon name="lucide:trash-2" class="size-3.5 mr-1" />
        Delete
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button size="sm" variant="outline">
            <Icon name="lucide:arrow-right-left" class="size-3.5 mr-1" />
            Move to…
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem v-for="s in PIPELINE" :key="s" @click="bulkStatus(s)">
            <span :class="['size-2 rounded-full mr-2', JOB_STATUS[s].dot]" />
            {{ JOB_STATUS[s].label }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="outline" @click="bulkStatus('archived')">
        <Icon name="lucide:archive" class="size-3.5 mr-1" />
        Archive
      </Button>
      <Button size="sm" variant="ghost" class="ml-auto" @click="clearSelection">
        Clear
      </Button>
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
              :class="['group relative cursor-grab active:cursor-grabbing rounded-lg border bg-card p-3 transition-all hover:border-primary/40',
                draggingId === job.id ? 'opacity-40 ring-1 ring-primary' : '']"
            >
              <button
                class="absolute right-1.5 top-1.5 hidden group-hover:flex items-center justify-center size-6 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Delete"
                @click.stop="askDelete([job.id])"
              >
                <Icon name="lucide:trash-2" class="size-3.5" />
              </button>
              <div class="flex items-start justify-between gap-2 pr-5">
                <p class="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">{{ job.title }}</p>
                <span
                  v-if="job.fit_score != null"
                  :class="['shrink-0 text-xs font-bold tabular-nums rounded-md px-1.5 py-0.5 bg-muted/60', scoreColor(job.fit_score)]"
                >{{ job.fit_score }}</span>
              </div>
              <p class="mt-1 text-xs text-muted-foreground truncate">{{ job.company }}</p>
              <div class="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span class="flex items-center gap-1 truncate">
                  <Icon :name="job.remote ? 'lucide:globe' : 'lucide:map-pin'" class="size-3 shrink-0" />
                  {{ job.remote ? 'Remote' : (job.location || '—') }}
                </span>
                <span v-if="job.source" class="shrink-0 rounded bg-muted/60 px-1.5 py-0.5">{{ sourceLabel(job.source) }}</span>
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
            <th class="w-10 px-3 py-2.5">
              <input
                type="checkbox"
                class="size-4 rounded border-border accent-primary cursor-pointer align-middle"
                :checked="allVisibleSelected"
                @change="toggleAll"
              >
            </th>
            <th class="text-left px-4 py-2.5 font-medium text-muted-foreground">Position</th>
            <th class="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Source</th>
            <th class="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Location</th>
            <th class="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
            <th class="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Fit</th>
            <th class="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Added</th>
            <th class="w-10 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="job in filtered"
            :key="job.id"
            class="border-b last:border-0 hover:bg-accent/50 transition-colors cursor-pointer"
            :class="selected.has(job.id) ? 'bg-primary/5' : ''"
            @click="navigateTo(`/jobs/${job.id}`)"
          >
            <td class="px-3 py-3" @click.stop>
              <input
                type="checkbox"
                class="size-4 rounded border-border accent-primary cursor-pointer align-middle"
                :checked="selected.has(job.id)"
                @change="toggleOne(job.id)"
              >
            </td>
            <td class="px-4 py-3">
              <div class="font-medium leading-tight">{{ job.title }}</div>
              <div class="text-muted-foreground text-xs mt-0.5">{{ job.company }}</div>
            </td>
            <td class="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
              {{ sourceLabel(job.source) }}
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
            <td class="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell" :title="job.created_at">
              {{ formatTimeRelative(job.created_at) }}
            </td>
            <td class="px-3 py-3" @click.stop>
              <button
                class="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Delete"
                @click="askDelete([job.id])"
              >
                <Icon name="lucide:trash-2" class="size-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="view === 'board' && jobs.length" class="text-xs text-muted-foreground flex items-center gap-1.5">
      <Icon name="lucide:move" class="size-3.5" />
      Drag cards between columns to change status. Hover a card to delete it.
    </p>

    <!-- Delete confirmation -->
    <Dialog v-model:open="confirmOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {{ pendingDelete.length }} job{{ pendingDelete.length > 1 ? 's' : '' }}?</DialogTitle>
          <DialogDescription>
            This permanently removes {{ pendingDelete.length > 1 ? 'these jobs' : 'this job' }} from the database. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" :disabled="deleting" @click="confirmOpen = false">Cancel</Button>
          <Button variant="destructive" :disabled="deleting" @click="doDelete">
            <Icon v-if="deleting" name="lucide:loader-2" class="size-4 mr-1 animate-spin" />
            <Icon v-else name="lucide:trash-2" class="size-4 mr-1" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  </div>
</template>
