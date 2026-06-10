<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

definePageMeta({ layout: 'default' })

const route = useRoute()
const supabase = useSupabaseClient()
const router = useRouter()
const saving = ref(false)
const deleting = ref(false)
const statusSaving = ref(false)
const error = ref('')

type JobStatus = 'new' | 'reviewing' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived'

const STATUS_PIPELINE: JobStatus[] = ['new', 'reviewing', 'applied', 'interviewing', 'offer', 'rejected']

const statusConfig: Record<JobStatus, { label: string; idle: string; active: string }> = {
  new:          { label: 'New',       idle: 'border-border text-muted-foreground',          active: 'bg-blue-500/15 border-blue-500 text-blue-400' },
  reviewing:    { label: 'Reviewing', idle: 'border-border text-muted-foreground',          active: 'bg-yellow-500/15 border-yellow-500 text-yellow-400' },
  applied:      { label: 'Applied',   idle: 'border-border text-muted-foreground',          active: 'bg-purple-500/15 border-purple-500 text-purple-400' },
  interviewing: { label: 'Interview', idle: 'border-border text-muted-foreground',          active: 'bg-orange-500/15 border-orange-500 text-orange-400' },
  offer:        { label: 'Offer',     idle: 'border-border text-muted-foreground',          active: 'bg-green-500/15 border-green-500 text-green-400' },
  rejected:     { label: 'Rejected',  idle: 'border-border text-muted-foreground',          active: 'bg-red-500/15 border-red-500 text-red-400' },
  archived:     { label: 'Archived',  idle: 'border-border text-muted-foreground',          active: 'bg-gray-500/15 border-gray-500 text-gray-400' },
}

const { data: job, refresh } = await useAsyncData(`job-${route.params.id}`, async () => {
  const { data } = await supabase.from('jobs').select('*').eq('id', route.params.id).single()
  return data
})

if (!job.value) throw createError({ statusCode: 404, message: 'Job not found' })

useHead({ title: `${job.value.title} — ${job.value.company}` })

const form = reactive({
  title: job.value.title,
  company: job.value.company,
  url: job.value.url ?? '',
  location: job.value.location ?? '',
  remote: job.value.remote,
  status: job.value.status as JobStatus,
  fit_score: job.value.fit_score,
  salary_min: job.value.salary_min,
  salary_max: job.value.salary_max,
  notes: job.value.notes ?? '',
})

const scoreClass = computed(() => {
  const s = job.value?.fit_score
  if (!s) return 'text-muted-foreground'
  if (s >= 70) return 'text-green-400'
  if (s >= 40) return 'text-yellow-400'
  return 'text-red-400'
})

const copied = ref(false)
async function copyCoverLetter() {
  if (!job.value?.cover_letter) return
  await navigator.clipboard.writeText(job.value.cover_letter)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

async function quickSetStatus(newStatus: JobStatus) {
  if (newStatus === form.status || statusSaving.value) return
  statusSaving.value = true
  const appliedAt = newStatus === 'applied' && !job.value?.applied_at
    ? new Date().toISOString()
    : (job.value?.applied_at ?? null)
  form.status = newStatus
  await supabase.from('jobs').update({ status: newStatus, applied_at: appliedAt }).eq('id', route.params.id)
  await refresh()
  statusSaving.value = false
}

async function save() {
  saving.value = true
  error.value = ''
  const { error: err } = await supabase.from('jobs').update({
    title: form.title,
    company: form.company,
    url: form.url || null,
    location: form.location || null,
    remote: form.remote,
    status: form.status,
    fit_score: form.fit_score,
    salary_min: form.salary_min,
    salary_max: form.salary_max,
    notes: form.notes || null,
    applied_at: form.status === 'applied' && !job.value?.applied_at ? new Date().toISOString() : job.value?.applied_at,
  }).eq('id', route.params.id)
  saving.value = false
  if (err) { error.value = err.message; return }
  await refresh()
}

async function deleteJob() {
  if (!confirm(`Delete "${form.title}" at ${form.company}?`)) return
  deleting.value = true
  await supabase.from('jobs').delete().eq('id', route.params.id)
  router.push('/jobs')
}
</script>

<template>
  <div class="max-w-xl space-y-5">

    <!-- Header -->
    <div class="flex items-start gap-3">
      <Button variant="ghost" size="sm" as-child class="shrink-0 mt-0.5">
        <NuxtLink href="/jobs">
          <Icon name="lucide:arrow-left" class="size-4 mr-1" />
          Back
        </NuxtLink>
      </Button>
      <div class="min-w-0 flex-1">
        <h1 class="text-xl font-bold leading-tight">{{ job?.title }}</h1>
        <p class="text-sm text-muted-foreground">{{ job?.company }}</p>
      </div>
      <div v-if="job?.fit_score" class="shrink-0 text-right">
        <div :class="['text-2xl font-bold tabular-nums leading-none', scoreClass]">{{ job.fit_score }}%</div>
        <div class="text-xs text-muted-foreground mt-0.5">fit score</div>
      </div>
    </div>

    <!-- Status pipeline — one click saves -->
    <div class="rounded-xl border bg-card p-4">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Status</p>
      <div class="flex flex-wrap gap-2" :class="{ 'opacity-50 pointer-events-none': statusSaving }">
        <button
          v-for="s in STATUS_PIPELINE"
          :key="s"
          @click="quickSetStatus(s)"
          :class="[
            'px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
            form.status === s ? statusConfig[s].active : statusConfig[s].idle + ' hover:border-foreground/30 hover:text-foreground'
          ]"
        >
          {{ statusConfig[s].label }}
        </button>
        <Icon v-if="statusSaving" name="lucide:loader-circle" class="size-4 animate-spin text-muted-foreground self-center ml-1" />
      </div>
      <p v-if="job?.applied_at" class="mt-3 text-xs text-muted-foreground">
        Applied {{ new Date(job.applied_at).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' }) }}
      </p>
    </div>

    <!-- Cover letter -->
    <div v-if="job?.cover_letter" class="rounded-xl border bg-card p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">Cover Letter</h2>
        <Button variant="outline" size="sm" @click="copyCoverLetter">
          <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="size-4 mr-1" />
          {{ copied ? 'Copied!' : 'Copy' }}
        </Button>
      </div>
      <pre class="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">{{ job.cover_letter }}</pre>
    </div>

    <!-- AI score reason -->
    <div v-if="job?.score_reason" class="rounded-xl border bg-card px-4 py-3 text-sm">
      <span class="font-medium">AI: </span>
      <span class="text-muted-foreground">{{ job.score_reason }}</span>
    </div>

    <!-- Edit form -->
    <div class="rounded-xl border bg-card p-6 space-y-4">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</p>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Job Title</label>
          <Input v-model="form.title" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Company</label>
          <Input v-model="form.company" />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium">Job URL</label>
        <div class="flex gap-2">
          <Input v-model="form.url" placeholder="https://..." class="flex-1" />
          <Button v-if="form.url" variant="outline" size="sm" as-child>
            <a :href="form.url" target="_blank" rel="noopener">
              <Icon name="lucide:external-link" class="size-4" />
            </a>
          </Button>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Location</label>
          <Input v-model="form.location" :disabled="form.remote" placeholder="Berlin, Germany" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Salary ($/mo)</label>
          <div class="flex gap-2 items-center">
            <Input v-model.number="form.salary_min" type="number" placeholder="3000" />
            <span class="text-muted-foreground text-sm shrink-0">—</span>
            <Input v-model.number="form.salary_max" type="number" placeholder="5000" />
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <input id="remote" v-model="form.remote" type="checkbox" class="rounded" />
        <label for="remote" class="text-sm font-medium cursor-pointer">Remote position</label>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium">Notes</label>
        <textarea
          v-model="form.notes"
          rows="3"
          placeholder="Interesting company, good tech stack, referral from..."
          class="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

      <div class="flex items-center justify-between pt-1">
        <Button :disabled="saving" @click="save">
          <Icon v-if="saving" name="lucide:loader-circle" class="size-4 mr-1 animate-spin" />
          <Icon v-else name="lucide:save" class="size-4 mr-1" />
          {{ saving ? 'Saving…' : 'Save Details' }}
        </Button>
        <Button variant="ghost" size="sm" class="text-destructive hover:text-destructive" :disabled="deleting" @click="deleteJob">
          <Icon name="lucide:trash-2" class="size-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>

    <p v-if="job?.created_at" class="text-xs text-muted-foreground px-1">
      Added {{ new Date(job.created_at).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' }) }}
    </p>

  </div>
</template>
