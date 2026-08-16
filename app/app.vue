<template>
  <NuxtLoadingIndicator :height="3" :duration="1000" :throttle="0" :hide-delay="300" color="var(--ui-primary)" />
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
