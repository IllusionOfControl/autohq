<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Signing in…' })

const client = useSupabaseClient()
const route = useRoute()

onMounted(async () => {
  const code = route.query.code as string | undefined
  if (code) {
    await client.auth.exchangeCodeForSession(code)
  }
  await navigateTo('/')
})
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
    <Icon name="lucide:loader-circle" class="size-8 animate-spin text-muted-foreground" />
    <p class="text-sm text-muted-foreground">Signing in…</p>
  </div>
</template>
