<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'Automations' })

interface SourceSetting {
  source_id: string
  label: string
  site_enabled: boolean
  telegram_enabled: boolean
}

const sources = ref<SourceSetting[]>([])
const loading = ref(true)
const saving = ref<Record<string, boolean>>({})

const sourceIcons: Record<string, { icon: string; color: string; description: string }> = {
  hh:        { icon: 'lucide:building-2', color: 'text-red-500',   description: 'Вакансии из России и СНГ' },
  remotive:  { icon: 'lucide:globe',      color: 'text-blue-500',  description: 'Международные remote вакансии' },
  arbeitnow: { icon: 'lucide:laptop',     color: 'text-green-500', description: 'Remote-first вакансии по тегам' },
}

async function fetchSources() {
  loading.value = true
  try {
    const data = await $fetch<SourceSetting[]>('/api/sources/settings')
    sources.value = data
  } finally {
    loading.value = false
  }
}

async function toggle(src: SourceSetting, field: 'site_enabled' | 'telegram_enabled') {
  const key = `${src.source_id}_${field}`
  saving.value[key] = true
  const newVal = !src[field]
  try {
    await $fetch(`/api/sources/${src.source_id}`, {
      method: 'PATCH',
      body: { [field]: newVal },
    })
    src[field] = newVal
  } finally {
    saving.value[key] = false
  }
}

const steps = [
  { label: 'n8n запускается по расписанию', icon: 'lucide:clock' },
  { label: 'Запрашивает вакансии из источников', icon: 'lucide:search' },
  { label: 'Фильтрует уже добавленные', icon: 'lucide:filter' },
  { label: 'Отправляет новые в AutoHQ', icon: 'lucide:send' },
  { label: 'Уведомляет в Telegram', icon: 'lucide:message-circle' },
]

onMounted(fetchSources)
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Automations</h1>
      <p class="text-muted-foreground text-sm mt-1">n8n workflows автоматически ищут и добавляют вакансии.</p>
    </div>

    <div class="rounded-xl border bg-card p-5 space-y-4">
      <div class="flex items-center gap-2">
        <span class="size-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
        <span class="font-medium text-sm">n8n работает</span>
        <a href="https://n8n.credorevolution.space" target="_blank" rel="noopener" class="ml-auto text-xs text-muted-foreground underline underline-offset-2">
          Открыть n8n →
        </a>
      </div>

      <div class="space-y-2">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Как это работает</p>
        <div class="space-y-2">
          <div v-for="(step, i) in steps" :key="i" class="flex items-center gap-3 text-sm">
            <div class="size-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
              {{ i + 1 }}
            </div>
            <Icon :name="step.icon" class="size-4 text-muted-foreground shrink-0" />
            <span>{{ step.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <p class="text-sm font-medium">Источники вакансий</p>

      <div v-if="loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-20 rounded-xl border bg-muted/20 animate-pulse" />
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="src in sources"
          :key="src.source_id"
          class="rounded-xl border bg-card p-4"
        >
          <div class="flex items-center gap-3 mb-3">
            <Icon
              :name="sourceIcons[src.source_id]?.icon ?? 'lucide:globe'"
              :class="['size-5 shrink-0', sourceIcons[src.source_id]?.color ?? 'text-muted-foreground']"
            />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm">{{ src.label }}</p>
              <p class="text-xs text-muted-foreground">{{ sourceIcons[src.source_id]?.description }}</p>
            </div>
          </div>

          <div class="flex gap-6">
            <button
              :disabled="saving[`${src.source_id}_site_enabled`]"
              class="flex items-center gap-2 text-xs cursor-pointer select-none disabled:opacity-50"
              @click="toggle(src, 'site_enabled')"
            >
              <span
                :class="[
                  'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                  src.site_enabled ? 'bg-primary' : 'bg-input',
                ]"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                    src.site_enabled ? 'translate-x-4' : 'translate-x-0',
                  ]"
                />
              </span>
              <span class="text-muted-foreground">Список на сайте</span>
            </button>

            <button
              :disabled="saving[`${src.source_id}_telegram_enabled`]"
              class="flex items-center gap-2 text-xs cursor-pointer select-none disabled:opacity-50"
              @click="toggle(src, 'telegram_enabled')"
            >
              <span
                :class="[
                  'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                  src.telegram_enabled ? 'bg-primary' : 'bg-input',
                ]"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                    src.telegram_enabled ? 'translate-x-4' : 'translate-x-0',
                  ]"
                />
              </span>
              <span class="text-muted-foreground">Telegram уведомления</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-xl border bg-card p-5 space-y-3">
      <p class="text-sm font-medium">Webhook endpoint</p>
      <p class="text-xs text-muted-foreground">n8n отправляет вакансии на этот URL:</p>
      <code class="block rounded-md bg-muted px-3 py-2 text-xs font-mono break-all">
        POST https://credorevolution.space/api/webhook/jobs
      </code>
      <p class="text-xs text-muted-foreground">Header: <code class="bg-muted px-1 rounded">x-webhook-secret: autohq-webhook-2026</code></p>
    </div>
  </div>
</template>
