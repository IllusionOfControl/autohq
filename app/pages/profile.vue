<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { useStorage } from '@vueuse/core'
import { Button } from '~/components/ui/button'

definePageMeta({ layout: 'default' })
useHead({ title: 'Resume' })

const REPO = 'CredoRevolution/obsidian-git-sync'
const PATHS: Record<'en' | 'ru', string> = { en: 'Personal/Resume EN.md', ru: 'Personal/Resume RU.md' }

const lang = useStorage<'en' | 'ru'>('autohq:resume-lang', 'en')

interface ResumeResp { lang: string; path: string; content: string; updated?: string | null; error: string | null }
const { data, pending, refresh } = await useFetch<ResumeResp>('/api/resume', {
  query: computed(() => ({ lang: lang.value })),
})

const md = new MarkdownIt({ html: false, linkify: true, breaks: false })
const html = computed(() => (data.value?.content ? md.render(data.value.content) : ''))

const githubEditUrl = computed(() =>
  `https://github.com/${REPO}/edit/main/${encodeURI(PATHS[lang.value])}`
)

function relDate(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString(lang.value === 'ru' ? 'ru' : 'en', { day: 'numeric', month: 'long', year: 'numeric' })
}

function printCv() { window.print() }
</script>

<template>
  <div class="space-y-4">

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3 no-print">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Resume</h1>
        <p class="text-muted-foreground text-sm mt-1">
          Источник — твой Obsidian-вол<wbr>т. Правишь в Obsidian, здесь всегда актуальное.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Language tabs -->
        <div class="inline-flex rounded-lg border bg-card p-0.5">
          <button
            v-for="l in (['en','ru'] as const)"
            :key="l"
            @click="lang = l"
            :class="['rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              lang === l ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']"
          >
            {{ l === 'en' ? 'English' : 'Русский' }}
          </button>
        </div>
        <Button variant="outline" size="sm" :disabled="pending" @click="refresh()">
          <Icon :name="pending ? 'lucide:loader-circle' : 'lucide:refresh-cw'" :class="['size-4', pending && 'animate-spin']" />
        </Button>
        <Button variant="outline" size="sm" @click="printCv" :disabled="!html">
          <Icon name="lucide:printer" class="size-4 mr-1.5" /> PDF
        </Button>
      </div>
    </div>

    <!-- Meta row -->
    <div v-if="!data?.error" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground no-print">
      <span class="inline-flex items-center gap-1">
        <Icon name="lucide:file-text" class="size-3.5" /> {{ data?.path }}
      </span>
      <span v-if="relDate(data?.updated)" class="inline-flex items-center gap-1">
        <Icon name="lucide:history" class="size-3.5" /> обновлено {{ relDate(data?.updated) }}
      </span>
      <a :href="githubEditUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 hover:text-foreground transition-colors">
        <Icon name="lucide:pencil" class="size-3.5" /> Редактировать на GitHub
      </a>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="surface p-10 max-w-3xl">
      <div class="space-y-3">
        <div class="h-7 w-1/3 rounded bg-muted/40 animate-pulse" />
        <div class="h-4 w-2/3 rounded bg-muted/30 animate-pulse" />
        <div class="h-4 w-full rounded bg-muted/20 animate-pulse" />
        <div class="h-4 w-5/6 rounded bg-muted/20 animate-pulse" />
      </div>
    </div>

    <!-- Error states -->
    <div v-else-if="data?.error === 'no-token'" class="surface border-dashed p-8 max-w-2xl text-center">
      <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
        <Icon name="lucide:key-round" class="size-6" />
      </div>
      <p class="font-medium">Нужен GitHub-токен</p>
      <p class="text-sm text-muted-foreground mt-1">
        Добавь переменную <code class="bg-muted px-1 rounded">GITHUB_TOKEN</code> в Vercel (Project → Settings → Environment Variables) с доступом к приватному репо волта, и передеплой. После этого резюме подтянется автоматически.
      </p>
    </div>

    <div v-else-if="data?.error === 'not-found'" class="surface border-dashed p-8 max-w-2xl text-center">
      <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon name="lucide:file-plus" class="size-6" />
      </div>
      <p class="font-medium">Файл резюме не найден</p>
      <p class="text-sm text-muted-foreground mt-1">
        Создай <code class="bg-muted px-1 rounded">{{ data?.path }}</code> в волте — и оно появится здесь.
      </p>
    </div>

    <div v-else-if="data?.error" class="surface border-dashed p-8 max-w-2xl text-center">
      <Icon name="lucide:cloud-off" class="size-8 text-muted-foreground mx-auto mb-3" />
      <p class="font-medium">Не удалось загрузить</p>
      <p class="text-sm text-muted-foreground mt-1">Проверь токен и доступ к репозиторию, затем обнови.</p>
    </div>

    <!-- The resume sheet -->
    <div v-else class="max-w-3xl">
      <div class="cv-sheet rounded-xl border bg-white shadow-xl p-8 sm:p-12">
        <div class="cv-prose" v-html="html" />
      </div>
    </div>

  </div>
</template>
