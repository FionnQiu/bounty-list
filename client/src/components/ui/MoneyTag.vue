<script setup>
import { computed } from "vue";

const props = defineProps({
  amount: { type: [Number, String], default: 0 },
  size: { type: String, default: "md" },
});

const CNY = "\uFFE5";

const text = computed(() => {
  const amountNum = Number(props.amount);
  if (!Number.isFinite(amountNum)) {
    return `${CNY}0`;
  }

  if (Number.isInteger(amountNum)) {
    return `${CNY}${amountNum}`;
  }

  return `${CNY}${amountNum.toFixed(2)}`;
});
</script>

<template>
  <span class="money-tag" :class="`money-tag--${size}`">{{ text }}</span>
</template>

<style scoped>
.money-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--glass-tag-height);
  min-height: var(--glass-tag-height);
  max-width: 100%;
  padding: var(--glass-tag-padding);
  border-radius: var(--glass-tag-radius);
  border: 1px solid rgba(143, 174, 240, 0.5);
  background:
    linear-gradient(180deg, rgba(62, 89, 140, 0.62), rgba(40, 60, 97, 0.56)),
    radial-gradient(circle at 50% -20%, rgba(224, 236, 255, 0.24), transparent 62%);
  box-shadow: var(--glass-tag-shadow);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #c5d9ff;
  font-size: var(--glass-tag-font-size);
  font-weight: var(--glass-tag-font-weight);
  white-space: nowrap;
  letter-spacing: 0.01em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.money-tag--sm {
  font-size: var(--glass-tag-font-size);
  min-height: var(--glass-tag-height);
  padding: var(--glass-tag-padding);
}

.money-tag--md {
  font-size: var(--glass-tag-font-size);
  min-height: var(--glass-tag-height);
  padding: var(--glass-tag-padding);
}

.money-tag--lg {
  font-size: var(--glass-tag-font-size);
  min-height: var(--glass-tag-height);
  padding: var(--glass-tag-padding);
}
</style>
