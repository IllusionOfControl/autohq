<script setup lang="ts">
import { Button } from '~/components/ui/button'

definePageMeta({ layout: 'default' })
useHead({ title: 'Control' })

// ── Live config (keywords + telegram threshold) ──
interface AppConfig { keywords: string; telegram_min_score: number; job_lookback_days: number }
const config = reactive<AppConfig>({ keywords: '', telegram_min_score: 70, job_lookback_days: 3 })
const cfgLoading = ref(true)
const cfgSaving = ref(false)
const cfgSaved = ref(false)
const cfgError = ref('')

async function loadConfig() {
  try {
    const data = await $fetch<AppConfig>('/api/config')
    config.keywords = data.keywords
    config.telegram_min_score = data.telegram_min_score
    config.job_lookback_days = data.job_lookback_days
  } finally {
    cfgLoading.value = false
  }
}
async function saveConfig() {
  cfgSaving.value = true
  cfgError.value = ''
  cfgSaved.value = false
  try {
    await $fetch('/api/config', {
      method: 'PATCH',
      body: {
        keywords: config.keywords,
        telegram_min_score: config.telegram_min_score,
        job_lookback_days: config.job_lookback_days,
      },
    })
    cfgSaved.value = true
    setTimeout(() => { cfgSaved.value = false }, 2000)
  } catch (e: any) {
    cfgError.value = e?.data?.message ?? 'Не удалось сохранить'
  } finally {
    cfgSaving.value = false
  }
}

// ── Sources (toggles + last import) ──
interface SourceSetting {
  source_id: string
  label: string
  site_enabled: boolean
  telegram_enabled: boolean
}
const sources = ref<SourceSetting[]>([])
const srcLoading = ref(true)
const saving = ref<Record<string, boolean>>({})
const lastImport = ref<Record<string, string>>({})

const sourceMeta: Record<string, { icon: string; color: string; description: string }> = {
  hh:        { icon: 'lucide:building-2', color: 'text-rose-400',    description: 'Россия и СНГ' },
  remotive:  { icon: 'lucide:globe',      color: 'text-blue-400',    description: 'Международные remote' },
  arbeitnow: { icon: 'lucide:laptop',     color: 'text-emerald-400', description: 'Remote-first по тегам' },
  habr:      { icon: 'lucide:code',       color: 'text-sky-400',     description: 'Хабр Карьера' },
  djinni:    { icon: 'lucide:briefcase',  color: 'text-violet-400',  description: 'Djinni — CIS/EU remote' },
}

async function loadSources() {
  srcLoading.value = true
  try {
    sources.value = await $fetch<SourceSetting[]>('/api/sources/settings')
  } finally {
    srcLoading.value = false
  }
}
async function loadLastImport() {
  // /api/jobs is ordered by created_at desc, so the first hit per source wins.
  const data = await $fetch<{ source: string | null; created_at: string }[]>('/api/jobs')
  const seen: Record<string, string> = {}
  for (const row of data) {
    if (row.source && !seen[row.source]) seen[row.source] = row.created_at
  }
  lastImport.value = seen
}
function relTime(iso?: string) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3.6e6)
  if (h < 1) return 'только что'
  if (h < 24) return `${h} ч назад`
  return `${Math.floor(h / 24)} дн назад`
}

async function toggle(src: SourceSetting, field: 'site_enabled' | 'telegram_enabled') {
  const key = `${src.source_id}_${field}`
  saving.value[key] = true
  const newVal = !src[field]
  try {
    await $fetch(`/api/sources/${src.source_id}`, { method: 'PATCH', body: { [field]: newVal } })
    src[field] = newVal
  } finally {
    saving.value[key] = false
  }
}

const runtimeConfig = useRuntimeConfig()

// Интеграции из env (NUXT_PUBLIC_N8N_URL / NUXT_PUBLIC_TELEGRAM_BOT).
// Незаданные просто не показываются.
const integrations = computed(() => {
  const items: { label: string; sub: string; href: string }[] = []
  const n8n = runtimeConfig.public.n8nUrl
  if (n8n) {
    let host = n8n
    try { host = new URL(n8n).host } catch { /* оставить как есть */ }
    items.push({ label: 'n8n', sub: host, href: n8n })
  }
  const tg = runtimeConfig.public.telegramBot
  if (tg) {
    const handle = tg.replace(/^@/, '')
    items.push({ label: 'Telegram Bot', sub: `@${handle}`, href: `https://t.me/${handle}` })
  }
  return items
})

// Webhook URL = публичный origin (NUXT_PUBLIC_APP_URL или текущий) + путь.
const requestOrigin = useRequestURL().origin
const webhookUrl = computed(() =>
  `${(runtimeConfig.public.appUrl || requestOrigin).replace(/\/$/, '')}/api/webhook/jobs`,
)

const webhookOpen = ref(false)
const copied = ref('')
function copy(text: string, tag: string) {
  navigator.clipboard.writeText(text)
  copied.value = tag
  setTimeout(() => { copied.value = '' }, 1500)
}

onMounted(() => { loadConfig(); loadSources(); loadLastImport() })
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Control</h1>
      <p class="text-muted-foreground text-sm mt-1">Поиск, источники и интеграции пайплайна вакансий.</p>
    </div>

    <!-- Search & Alerts (the live levers) -->
    <div class="surface p-6 space-y-5">
      <div class="flex items-center gap-2">
        <Icon name="lucide:sliders-horizontal" class="size-4 text-primary" />
        <p class="text-sm font-semibold">Поиск и уведомления</p>
        <span class="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-400">
          <span class="size-1.5 rounded-full bg-emerald-400" /> live
        </span>
      </div>

      <div v-if="cfgLoading" class="h-24 rounded-lg bg-muted/30 animate-pulse" />
      <template v-else>
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Поисковые ключевые слова</label>
          <textarea
            v-model="config.keywords"
            rows="2"
            placeholder="vue nuxt typescript frontend"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
          />
          <p class="text-xs text-muted-foreground">
            Просто слова через пробел — <code class="bg-muted px-1 rounded">vue nuxt typescript</code>. n8n читает это при каждом прогоне и сам подставляет нужный синтаксис под каждый источник (Remotive, оба HH.ru, Djinni). Arbeitnow и Habr ищут по своим тегам.
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium flex items-center justify-between">
            <span>Порог Telegram-уведомлений</span>
            <span class="tabular-nums text-primary font-semibold">{{ config.telegram_min_score }}+</span>
          </label>
          <input
            v-model.number="config.telegram_min_score"
            type="range" min="0" max="100" step="5"
            class="w-full accent-primary"
          />
          <p class="text-xs text-muted-foreground">В Telegram приходят только вакансии со score ≥ {{ config.telegram_min_score }}. Применяется сразу.</p>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium">Период поиска (дней назад)</label>
          <input
            v-model.number="config.job_lookback_days"
            type="number" min="0" step="1"
            placeholder="3"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <p class="text-xs text-muted-foreground">
            Насколько глубоко по дате публикации искать (поле <code class="bg-muted px-1 rounded">date_from</code> у HH.ru).
            <code class="bg-muted px-1 rounded">0</code> — за всё время (ограничено лимитом источника, у HH.ru это 2000 вакансий).
          </p>
        </div>

        <div class="flex items-center gap-3">
          <Button :disabled="cfgSaving" @click="saveConfig">
            <Icon v-if="cfgSaving" name="lucide:loader-circle" class="size-4 mr-1.5 animate-spin" />
            <Icon v-else-if="cfgSaved" name="lucide:check" class="size-4 mr-1.5" />
            <Icon v-else name="lucide:save" class="size-4 mr-1.5" />
            {{ cfgSaving ? 'Сохраняю…' : cfgSaved ? 'Сохранено!' : 'Сохранить' }}
          </Button>
          <p v-if="cfgError" class="text-sm text-destructive">{{ cfgError }}</p>
        </div>
      </template>
    </div>

    <!-- Sources -->
    <div class="space-y-3">
      <p class="text-sm font-medium flex items-center gap-2">
        <Icon name="lucide:radio" class="size-4 text-muted-foreground" /> Источники вакансий
      </p>

      <div v-if="srcLoading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-20 surface bg-muted/20 animate-pulse" />
      </div>

      <div v-else class="space-y-2">
        <div v-for="src in sources" :key="src.source_id" class="surface p-4">
          <div class="flex items-center gap-3 mb-3">
            <Icon :name="sourceMeta[src.source_id]?.icon ?? 'lucide:globe'"
              :class="['size-5 shrink-0', sourceMeta[src.source_id]?.color ?? 'text-muted-foreground']" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm">{{ src.label }}</p>
              <p class="text-xs text-muted-foreground">{{ sourceMeta[src.source_id]?.description }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-[11px] text-muted-foreground uppercase tracking-wide">Последний импорт</p>
              <p class="text-xs font-medium tabular-nums">{{ relTime(lastImport[src.source_id]) }}</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-x-6 gap-y-2">
            <button
              v-for="f in (['site_enabled','telegram_enabled'] as const)"
              :key="f"
              :disabled="saving[`${src.source_id}_${f}`]"
              class="flex items-center gap-2 text-xs cursor-pointer select-none disabled:opacity-50"
              @click="toggle(src, f)"
            >
              <span :class="['relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                src[f] ? 'bg-primary' : 'bg-input']">
                <span :class="['inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                  src[f] ? 'translate-x-4' : 'translate-x-0']" />
              </span>
              <span class="text-muted-foreground">{{ f === 'site_enabled' ? 'Список на сайте' : 'Telegram' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Connections -->
    <div class="surface p-5 space-y-3">
      <p class="text-sm font-medium flex items-center gap-2">
        <Icon name="lucide:plug" class="size-4 text-muted-foreground" /> Интеграции
      </p>
      <div v-if="integrations.length" class="space-y-2.5">
        <div v-for="it in integrations" :key="it.label" class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="size-2 rounded-full bg-emerald-400" />
            <div>
              <p class="text-sm font-medium">{{ it.label }}</p>
              <p class="text-xs text-muted-foreground">{{ it.sub }}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" as-child>
            <a :href="it.href" target="_blank" rel="noopener">Открыть</a>
          </Button>
        </div>
      </div>
      <p v-else class="text-xs text-muted-foreground">
        Задай <code class="bg-muted px-1 rounded">NUXT_PUBLIC_N8N_URL</code> и
        <code class="bg-muted px-1 rounded">NUXT_PUBLIC_TELEGRAM_BOT</code>, чтобы показать ссылки.
      </p>
    </div>

    <!-- Webhook (reference, collapsed) -->
    <div class="surface p-5">
      <button class="flex w-full items-center justify-between" @click="webhookOpen = !webhookOpen">
        <span class="text-sm font-medium flex items-center gap-2">
          <Icon name="lucide:webhook" class="size-4 text-muted-foreground" /> Webhook endpoint
        </span>
        <Icon :name="webhookOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-4 text-muted-foreground" />
      </button>
      <div v-if="webhookOpen" class="mt-4 space-y-3">
        <div class="flex gap-2">
          <code class="flex-1 rounded-md bg-muted px-3 py-2 text-xs font-mono break-all">POST {{ webhookUrl }}</code>
          <Button variant="outline" size="sm" @click="copy(webhookUrl, 'url')">
            <Icon :name="copied === 'url' ? 'lucide:check' : 'lucide:copy'" class="size-4" />
          </Button>
        </div>
        <div class="flex gap-2">
          <code class="flex-1 rounded-md bg-muted px-3 py-2 text-xs font-mono break-all">x-webhook-secret: &lt;your WEBHOOK_SECRET&gt;</code>
          <Button variant="outline" size="sm" @click="copy('x-webhook-secret', 'secret')">
            <Icon :name="copied === 'secret' ? 'lucide:check' : 'lucide:copy'" class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
