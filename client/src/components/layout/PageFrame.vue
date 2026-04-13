<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  contentAriaLabel: {
    type: String,
    default: "",
  },
  headerVisible: {
    type: Boolean,
    default: false,
  },
});

function resolveContentAriaLabel() {
  if (props.contentAriaLabel) {
    return props.contentAriaLabel;
  }
  return `${props.title}主体内容`;
}
</script>

<template>
  <main class="page-shell page-frame">
    <header :class="headerVisible ? 'page-frame__header' : 'sr-only'">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </header>

    <section class="page-shell__body page-frame__body" :aria-label="resolveContentAriaLabel()">
      <slot />
    </section>
  </main>
</template>

<style scoped>
.page-frame {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.page-frame__header {
  margin-bottom: var(--space-3);
  display: grid;
  gap: var(--space-1);
}

.page-frame__header h1 {
  font-size: clamp(1.4rem, 2vw, 1.8rem);
}

.page-frame__header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.page-frame__body {
  min-height: 0;
}
</style>
