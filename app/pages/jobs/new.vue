<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'

definePageMeta({ layout: 'default' })
useHead({ title: 'Add Job' })

const router = useRouter()
const saving = ref(false)
const error = ref('')

const form = reactive({
  title: '',
  company: '',
  url: '',
  location: '',
  remote: false,
  status: 'new' as const,
  fit_score: null as number | null,
  salary_min: null as number | null,
  salary_max: null as number | null,
  notes: '',
})

async function save() {
  if (!form.title || !form.company) {
    error.value = 'Title and company are required.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/jobs', {
      method: 'POST',
      body: {
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
      },
    })
    router.push('/jobs')
  } catch (e: any) {
    error.value = e?.data?.message ?? e?.message ?? 'Failed to save'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-xl space-y-6">
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="sm" as-child>
        <NuxtLink href="/jobs">
          <Icon name="lucide:arrow-left" class="size-4 mr-1" />
          Back
        </NuxtLink>
      </Button>
      <h1 class="text-2xl font-bold tracking-tight">Add Job</h1>
    </div>

    <div class="surface p-6 space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Job Title <span class="text-destructive">*</span></label>
          <Input v-model="form.title" placeholder="Senior Vue Developer" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Company <span class="text-destructive">*</span></label>
          <Input v-model="form.company" placeholder="Acme Inc." />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium">Job URL</label>
        <Input v-model="form.url" placeholder="https://linkedin.com/jobs/..." />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Location</label>
          <Input v-model="form.location" placeholder="Berlin, Germany" :disabled="form.remote" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Status</label>
          <Select v-model="form.status">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interviewing">Interviewing</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <input id="remote" v-model="form.remote" type="checkbox" class="rounded" />
        <label for="remote" class="text-sm font-medium cursor-pointer">Remote position</label>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Fit Score (0–100)</label>
          <Input v-model.number="form.fit_score" type="number" min="0" max="100" placeholder="85" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Salary Min ($)</label>
          <Input v-model.number="form.salary_min" type="number" placeholder="3000" />
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Salary Max ($)</label>
          <Input v-model.number="form.salary_max" type="number" placeholder="5000" />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium">Notes</label>
        <textarea
          v-model="form.notes"
          rows="3"
          placeholder="Interesting company, good tech stack..."
          class="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

      <div class="flex gap-2 pt-2">
        <Button :disabled="saving" @click="save">
          <Icon v-if="saving" name="lucide:loader-circle" class="size-4 mr-1 animate-spin" />
          <Icon v-else name="lucide:save" class="size-4 mr-1" />
          {{ saving ? 'Saving…' : 'Save Job' }}
        </Button>
        <Button variant="outline" as-child>
          <NuxtLink href="/jobs">Cancel</NuxtLink>
        </Button>
      </div>
    </div>
  </div>
</template>
