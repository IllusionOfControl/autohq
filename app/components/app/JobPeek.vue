<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Sheet, SheetContent } from '~/components/ui/sheet'
import { JOB_STATUS, PIPELINE, scoreColor, type JobStatus } from '~/composables/useJobStatus'

/** The summary the board already has in memory — shown instantly on open. */
interface JobSummary {
  id: string
  title: string
  company: string
  location: string | null
  remote: boolean
  status: JobStatus
  fit_score: number | null
  url: string | null
  source: string | null
  applied_at: string | null
}

const props = defineProps<{
  open: boolean
  job: JobSummary | null
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  /** status (or other field) changed in the DB — parent syncs its local copy */
  (e: 'updated', id: string, patch: Record<string, unknown>): void
  (e: 'deleted', id: string): void
}>()

const supabase = useSupabaseClient()

// ── Lazy-loaded heavy fields (not in the board's summary query) ──
interface JobDetails {
  cover_letter: string | null
  score_reason: string | null
  notes: string | null
  description: string | null
  salary_min: number | null
  salary_max: number | null
}
const details = ref<JobDetails | null>(null)
const loadingDetails = ref(false)

// Fetch the rest of the row whenever a new job is opened.
watch(
  () => [props.open, props.job?.id] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) return
    details.value = null
    loadingDetails.value = true
    const { data } = await supabase
      .from('jobs')
      .select('cover_letter, score_reason, notes, description, salary_min, salary_max')
      .eq('id', id)
      .maybeSingle()
    details.value = (data as JobDetails) ?? null
    loadingDetails.value = false
  },
)

// ── Quick status change ──
const statusSaving = ref(false)
async function setStatus(s: JobStatus) {
  const job = props.job
  if (!job || s === job.status || statusSaving.value) return
  statusSaving.value = true
  const patch: Record<string, unknown> = { status: s }
  if (s === 'applied' && !job.applied_at) patch.applied_at = new Date().toISOString()
  const { error } = await supabase.from('jobs').update(patch).eq('id', job.id)
  statusSaving.value = false
  if (!error) emit('updated', job.id, patch)
}

// ── Copy cover letter ──
const copied = ref(false)
async function copyCover() {
  if (!details.value?.cover_letter) return
  await navigator.clipboard.writeText(details.value.cover_letter)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// ── Delete ──
const deleting = ref(false)
async function del() {
  const job = props.job
  if (!job) return
  if (!confirm(`Delete "${job.title}" at ${job.company}?`)) return
  deleting.value = true
  const { error } = await supabase.from('jobs').delete().eq('id', job.id)
  deleting.value = false
  if (error) { alert('Delete failed: ' + error.message); return }
  emit('deleted', job.id)
  emit('update:open', false)
}

const SOURCE_LABELS: Record<string, string> = {
  remotive: 'Remotive', arbeitnow: 'Arbeitnow', habr: 'Habr Career',
  hh: 'HH.ru', djinni: 'Djinni', linkedin: 'LinkedIn', unknown: 'Other',
}
function sourceLabel(s: string | null): string {
  if (!s) return 'Other'
  return SOURCE_LABELS[s] ?? s
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      side="right"
      class="w-full sm:max-w-md flex flex-col gap-0 p-0"
      :show-close-button="false"
    >
      <template v-if="job">
        <!-- Header -->
        <div class="flex items-start gap-3 border-b px-5 py-4">
          <div class="min-w-0 flex-1">
            <h2 class="text-base font-bold leading-tight">{{ job.title }}</h2>
            <p class="text-sm text-muted-foreground mt-0.5">{{ job.company }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span class="flex items-center gap-1">
                <Icon :name="job.remote ? 'lucide:globe' : 'lucide:map-pin'" class="size-3" />
                {{ job.remote ? 'Remote' : (job.location || '—') }}
              </span>
              <span v-if="job.source" class="rounded bg-muted/60 px-1.5 py-0.5">{{ sourceLabel(job.source) }}</span>
            </div>
          </div>
          <div v-if="job.fit_score != null" class="shrink-0 text-right">
            <div :class="['text-2xl font-bold tabular-nums leading-none', scoreColor(job.fit_score)]">{{ job.fit_score }}%</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">fit score</div>
          </div>
          <Button variant="ghost" size="icon-sm" class="shrink-0" @click="emit('update:open', false)">
            <Icon name="lucide:x" class="size-4" />
          </Button>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <!-- Status pipeline -->
          <div>
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Status</p>
            <div class="flex flex-wrap gap-1.5" :class="{ 'opacity-50 pointer-events-none': statusSaving }">
              <button
                v-for="s in PIPELINE"
                :key="s"
                @click="setStatus(s)"
                :class="[
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all',
                  job.status === s ? JOB_STATUS[s].chip : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                ]"
              >
                <span :class="['size-1.5 rounded-full', job.status === s ? JOB_STATUS[s].dot : 'bg-current opacity-40']" />
                {{ JOB_STATUS[s].label }}
              </button>
            </div>
            <p v-if="job.applied_at" class="mt-2 text-xs text-muted-foreground">
              Applied {{ new Date(job.applied_at).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' }) }}
            </p>
          </div>

          <!-- Salary -->
          <div v-if="details && (details.salary_min || details.salary_max)" class="text-sm">
            <span class="text-muted-foreground">Salary: </span>
            <span class="font-medium">
              {{ details.salary_min ? '$' + details.salary_min : '?' }}–{{ details.salary_max ? '$' + details.salary_max : '?' }}/mo
            </span>
          </div>

          <!-- AI score reason -->
          <div v-if="details?.score_reason" class="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
            <span class="font-medium">AI: </span>
            <span class="text-muted-foreground">{{ details.score_reason }}</span>
          </div>

          <!-- Cover letter -->
          <div v-if="details?.cover_letter" class="space-y-2">
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cover Letter</p>
              <Button variant="outline" size="sm" @click="copyCover">
                <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="size-3.5 mr-1" />
                {{ copied ? 'Copied!' : 'Copy' }}
              </Button>
            </div>
            <pre class="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed rounded-lg border bg-muted/20 p-3 max-h-64 overflow-y-auto">{{ details.cover_letter }}</pre>
          </div>

          <!-- Notes -->
          <div v-if="details?.notes" class="space-y-1">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
            <p class="text-sm whitespace-pre-wrap">{{ details.notes }}</p>
          </div>

          <!-- Description -->
          <div v-if="details?.description" class="space-y-1">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
            <p class="text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">{{ details.description }}</p>
          </div>

          <div v-if="loadingDetails" class="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="lucide:loader-circle" class="size-3.5 animate-spin" />
            Loading details…
          </div>
        </div>

        <!-- Footer actions -->
        <div class="flex items-center gap-2 border-t px-5 py-3">
          <Button size="sm" as-child>
            <NuxtLink :href="`/jobs/${job.id}`">
              <Icon name="lucide:square-pen" class="size-4 mr-1" />
              Edit full page
            </NuxtLink>
          </Button>
          <Button v-if="job.url" variant="outline" size="sm" as-child>
            <a :href="job.url" target="_blank" rel="noopener">
              <Icon name="lucide:external-link" class="size-4 mr-1" />
              Original
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="ml-auto text-destructive hover:text-destructive"
            :disabled="deleting"
            @click="del"
          >
            <Icon name="lucide:trash-2" class="size-4 mr-1" />
            Delete
          </Button>
        </div>
      </template>
    </SheetContent>
  </Sheet>
</template>
