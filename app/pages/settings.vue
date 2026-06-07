<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

definePageMeta({ layout: 'default' })
useHead({ title: 'Settings' })

const searchTerms = ref('Vue.js, Nuxt.js, TypeScript, Frontend developer')
const webhookSecret = ref('autohq-webhook-2026')
const saved = ref(false)

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

function saveSettings() {
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}
</script>

<template>
  <div class="max-w-xl space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Settings</h1>
      <p class="text-muted-foreground text-sm mt-1">Настройки поиска и интеграций.</p>
    </div>

    <div class="rounded-xl border bg-card p-6 space-y-4">
      <p class="text-sm font-semibold">Поисковые запросы</p>
      <p class="text-xs text-muted-foreground">Ключевые слова для n8n workflows. Меняй их прямо в n8n.</p>

      <div class="space-y-1.5">
        <label class="text-sm font-medium">Текущие термины</label>
        <Input v-model="searchTerms" placeholder="Vue.js, Nuxt.js, TypeScript..." />
        <p class="text-xs text-muted-foreground">Чтобы применить — обнови в n8n: node "Fetch HH.ru" / "Fetch Remotive" → параметр text</p>
      </div>
    </div>

    <div class="rounded-xl border bg-card p-6 space-y-4">
      <p class="text-sm font-semibold">Webhook</p>

      <div class="space-y-3">
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Endpoint URL</label>
          <div class="flex gap-2">
            <code class="flex-1 rounded-md bg-muted px-3 py-2 text-xs font-mono">
              https://credorevolution.space/api/webhook/jobs
            </code>
            <Button variant="outline" size="sm" @click="copyToClipboard('https://credorevolution.space/api/webhook/jobs')">
              <Icon name="lucide:copy" class="size-4" />
            </Button>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium">Secret header</label>
          <div class="flex gap-2">
            <code class="flex-1 rounded-md bg-muted px-3 py-2 text-xs font-mono">
              x-webhook-secret: {{ webhookSecret }}
            </code>
            <Button variant="outline" size="sm" @click="copyToClipboard(`x-webhook-secret: ${webhookSecret}`)">
              <Icon name="lucide:copy" class="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div class="rounded-md bg-muted/50 p-3 space-y-1">
        <p class="text-xs font-medium">Пример запроса</p>
        <pre class="text-xs text-muted-foreground whitespace-pre-wrap">POST /api/webhook/jobs
x-webhook-secret: {{ webhookSecret }}

{
  "title": "Senior Vue Developer",
  "company": "Acme Inc",
  "url": "https://...",
  "remote": true,
  "fit_score": 85
}</pre>
      </div>
    </div>

    <div class="rounded-xl border bg-card p-6 space-y-4">
      <p class="text-sm font-semibold">Интеграции</p>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="size-2 rounded-full bg-green-500" />
            <div>
              <p class="text-sm font-medium">n8n</p>
              <p class="text-xs text-muted-foreground">n8n.credorevolution.space</p>
            </div>
          </div>
          <Button variant="outline" size="sm" as-child>
            <a href="https://n8n.credorevolution.space" target="_blank" rel="noopener">Open</a>
          </Button>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="size-2 rounded-full bg-green-500" />
            <div>
              <p class="text-sm font-medium">Telegram Bot</p>
              <p class="text-xs text-muted-foreground">@myfirstgmailbot</p>
            </div>
          </div>
          <Button variant="outline" size="sm" as-child>
            <a href="https://t.me/myfirstgmailbot" target="_blank" rel="noopener">Open</a>
          </Button>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="size-2 rounded-full bg-green-500" />
            <div>
              <p class="text-sm font-medium">Supabase</p>
              <p class="text-xs text-muted-foreground">lbqzcsauuuqngsfyikcp.supabase.co</p>
            </div>
          </div>
          <Button variant="outline" size="sm" as-child>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener">Open</a>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
