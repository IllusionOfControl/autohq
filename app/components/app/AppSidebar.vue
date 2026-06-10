<script setup lang="ts">
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarRail,
} from '~/components/ui/sidebar'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const avatarUrl = computed(() => user.value?.user_metadata?.avatar_url as string | undefined)
const displayName = computed(() => (user.value?.user_metadata?.full_name as string | undefined) ?? 'You')

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}

const nav = [
  {
    label: 'Workspace',
    items: [
      { title: 'Dashboard', icon: 'lucide:layout-dashboard', href: '/' },
      { title: 'Jobs', icon: 'lucide:briefcase', href: '/jobs' },
      { title: 'Applications', icon: 'lucide:send', href: '/applications' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { title: 'Profile & CV', icon: 'lucide:user', href: '/profile' },
      { title: 'Automations', icon: 'lucide:bot', href: '/automations' },
      { title: 'Settings', icon: 'lucide:settings', href: '/settings' },
    ],
  },
]

const route = useRoute()
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <NuxtLink href="/">
              <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Icon name="lucide:zap" class="size-4" />
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">AutoHQ</span>
                <span class="truncate text-xs text-muted-foreground">Job Search OS</span>
              </div>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup v-for="group in nav" :key="group.label">
        <SidebarGroupLabel>{{ group.label }}</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem v-for="item in group.items" :key="item.title">
            <SidebarMenuButton as-child :is-active="route.path === item.href" :tooltip="item.title">
              <NuxtLink :href="item.href">
                <Icon :name="item.icon" class="size-4" />
                <span>{{ item.title }}</span>
              </NuxtLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <div class="flex items-center gap-2 px-2 py-1.5">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="displayName"
              class="size-6 rounded-full object-cover shrink-0"
            />
            <Icon v-else name="lucide:circle-user" class="size-6 text-muted-foreground shrink-0" />
            <span class="truncate text-sm flex-1">{{ displayName }}</span>
            <button
              @click="signOut"
              title="Sign out"
              class="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="lucide:log-out" class="size-4" />
            </button>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
