<script setup lang="ts">
const route = useRoute()

interface NavTab {
  label: string
  path: string
  activeIcon: string
  inactiveIcon: string
}

const navTabs: NavTab[] = [
  {
    label: 'Home',
    path: '/home',
    activeIcon: 'i-heroicons-home-solid',
    inactiveIcon: 'i-heroicons-home',
  },
  {
    label: 'Workouts',
    path: '/workouts',
    activeIcon: 'i-heroicons-bolt-solid',
    inactiveIcon: 'i-heroicons-bolt',
  },
  {
    label: 'Body',
    path: '/body',
    activeIcon: 'i-heroicons-user-solid',
    inactiveIcon: 'i-heroicons-user',
  },
  {
    label: 'Check in',
    path: '/check-in',
    activeIcon: 'i-heroicons-clipboard-document-check-solid',
    inactiveIcon: 'i-heroicons-clipboard-document-check',
  },
  {
    label: 'Profile',
    path: '/profile',
    activeIcon: 'i-heroicons-user-circle-solid',
    inactiveIcon: 'i-heroicons-user-circle',
  },
]

function isActive(tabPath: string): boolean {
  return route.path === tabPath
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]">
    <div class="flex items-stretch">
      <NuxtLink
        v-for="tab in navTabs"
        :key="tab.path"
        :to="tab.path"
        class="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 text-xs transition-colors"
        :class="isActive(tab.path) ? 'text-primary' : 'text-gray-400 dark:text-gray-500'"
      >
        <UIcon
          :name="isActive(tab.path) ? tab.activeIcon : tab.inactiveIcon"
          class="text-xl"
        />
        <span>{{ tab.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
