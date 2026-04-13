<script setup>
defineProps({
  title: { type: String, default: "暂无数据" },
  description: { type: String, default: "请稍后再试。" },
});
</script>

<template>
  <section class="empty-state card py-10 text-center">
    <h3>{{ title }}</h3>
    <p class="text-secondary">{{ description }}</p>
    <slot />
  </section>
</template>
