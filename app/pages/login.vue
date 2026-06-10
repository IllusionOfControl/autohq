<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Sign in' })

const supabase = useSupabaseClient()
const loading = ref(false)
const error = ref('')

async function signInWithGitHub() {
  loading.value = true
  error.value = ''
  const { error: err } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${window.location.origin}/confirm` },
  })
  if (err) {
    error.value = err.message
    loading.value = false
  }
}

const features = [
  { icon: 'lucide:bot',          label: 'AI Scoring',      desc: 'Every job rated 1–100 against your profile' },
  { icon: 'lucide:file-text',    label: 'Cover Letters',   desc: 'Generated automatically for top matches' },
  { icon: 'lucide:send',         label: 'Telegram Alerts', desc: 'Only jobs with score ≥ 70 notify you' },
  { icon: 'lucide:refresh-cw',   label: '5 Sources',       desc: 'Remotive, Djinni, Habr, Arbeitnow, HH.ru' },
]

const stack = ['Nuxt 3', 'Supabase', 'n8n', 'OpenAI', 'Vercel']
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">

    <!-- Subtle radial glow -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div class="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-blue-500/5 blur-3xl" />
    </div>

    <div class="relative w-full max-w-sm space-y-8">

      <!-- Logo + tagline -->
      <div class="text-center space-y-3">
        <div class="inline-flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground mx-auto">
          <Icon name="lucide:zap" class="size-6" />
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">AutoHQ</h1>
          <p class="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            AI-powered job search OS.<br>
            Collects, scores, and writes cover letters — automatically.
          </p>
        </div>
      </div>

      <!-- Feature list -->
      <div class="rounded-xl border bg-card divide-y divide-border overflow-hidden">
        <div
          v-for="f in features"
          :key="f.label"
          class="flex items-start gap-3 px-4 py-3"
        >
          <div class="size-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <Icon :name="f.icon" class="size-3.5 text-muted-foreground" />
          </div>
          <div>
            <div class="text-sm font-medium leading-tight">{{ f.label }}</div>
            <div class="text-xs text-muted-foreground mt-0.5">{{ f.desc }}</div>
          </div>
        </div>
      </div>

      <!-- Auth -->
      <div class="space-y-3">
        <button
          @click="signInWithGitHub"
          :disabled="loading"
          class="w-full flex items-center justify-center gap-2.5 rounded-xl border bg-card hover:bg-muted transition-colors px-4 py-3 text-sm font-medium disabled:opacity-60"
        >
          <Icon v-if="loading" name="lucide:loader-circle" class="size-4 animate-spin" />
          <svg v-else viewBox="0 0 24 24" class="size-4 fill-current" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          {{ loading ? 'Redirecting…' : 'Sign in with GitHub' }}
        </button>
        <p v-if="error" class="text-xs text-destructive text-center">{{ error }}</p>
        <p class="text-xs text-muted-foreground text-center">
          Personal tool — access is limited to the owner.
        </p>
      </div>

      <!-- Tech stack badges -->
      <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
        <span
          v-for="t in stack"
          :key="t"
          class="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-mono"
        >{{ t }}</span>
      </div>

    </div>
  </div>
</template>
