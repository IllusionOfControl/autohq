<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Signing in…' })
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
    <Icon name="lucide:loader-circle" class="size-8 animate-spin text-muted-foreground" />
    <p class="text-sm text-muted-foreground">Signing in…</p>
  </div>
</template>
