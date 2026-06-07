<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'

definePageMeta({ layout: 'default' })

const route = useRoute()
const supabase = useSupabaseClient()
const router = useRouter()
const saving = ref(false)
const deleting = ref(false)
const error = ref('')

type JobStatus = 'new' | 'reviewing' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived'

const { data: job, refresh } = await useAsyncData(`job-${route.params.id}`, async () => {
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', route.params.id)
    .single()
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

const statusConfig: Record<JobStatus, { label: string; class: string }> = {
  new:          { label: 'New',        class: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  reviewing:    { label: 'Reviewing',  class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  applied:      { label: 'Applied',    class: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  interviewing: { label: 'Interview',  class: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  offer:        { label: 'Offer 🎉',   class: 'bg-green-500/10 text-green-500 border-green-500/20' },
  rejected:     { label: 'Rejected',   class: 'bg-red-500/10 text-red-500 border-red-500/20' },
  archived:     { label: 'Archived',   class: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

async function save() {
  saving.value = true
  error.value = ''
  const { error: err } = await supabase
    .from('jobs')
    .update({
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
    })
    .eq('id', route.params.id)
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
  <div class="max-w-xl space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="sm" as-child>
          <NuxtLink href="/jobs">
            <Icon name="lucide:arrow-left" class="size-4 mr-1" />
            Back
          </NuxtLink>
        </Button>
        <div>
          <h1 class="text-xl font-bold leading-tight">{{ job?.title }}</h1>
          <p class="text-sm text-muted-foreground">{{ job?.company }}</p>
        </div>
      </div>
      <span :class="['text-xs rounded-full border px-2.5 py-1 font-medium', statusConfig[form.status].class]">
        {{ statusConfig[form.status].label }}
      </span>
    </div>

    <div class="rounded-xl border bg-card p-6 space-y-4">
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
          <label class="text-sm font-medium">Status</label>
          <Select v-model="form.status">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="(cfg, key) in statusConfig" :key="key" :value="key">
                {{ cfg.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Fit Score (0–100)</label>
          <Input v-model.number="form.fit_score" type="number" min="0" max="100" />
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
          rows="4"
          placeholder="Interesting company, good tech stack, referral from..."
          class="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <div v-if="job?.applied_at" class="text-xs text-muted-foreground">
        Applied: {{ new Date(job.applied_at).toLocaleDateString() }}
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

      <div class="flex items-center justify-between pt-2">
        <Button :disabled="saving" @click="save">
          <Icon v-if="saving" name="lucide:loader-circle" class="size-4 mr-1 animate-spin" />
          <Icon v-else name="lucide:save" class="size-4 mr-1" />
          {{ saving ? 'Saving…' : 'Save Changes' }}
        </Button>
        <Button variant="ghost" size="sm" class="text-destructive hover:text-destructive" :disabled="deleting" @click="deleteJob">
          <Icon name="lucide:trash-2" class="size-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>

    <div v-if="job?.created_at" class="text-xs text-muted-foreground px-1">
      Added {{ new Date(job.created_at).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' }) }}
    </div>
  </div>
</template>
