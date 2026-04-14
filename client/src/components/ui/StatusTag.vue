<script setup>
import { computed } from "vue";
import { formatApplicationStatusLabel, formatBountyStatusLabel } from "../../utils/bountyStatus.js";

const props = defineProps({
  status: { type: String, default: "" },
  type: { type: String, default: "bounty" },
});

const label = computed(() =>
  props.type === "application"
    ? formatApplicationStatusLabel(props.status)
    : formatBountyStatusLabel(props.status),
);

const statusClass = computed(() => `status-tag--${props.status || "unknown"}`);
</script>

<template>
  <span class="status-tag" :class="[`status-tag--${type}`, statusClass]">
    {{ label }}
  </span>
</template>

<style scoped>
.status-tag {
  --tag-color: #c8d7f4;
  --tag-border: var(--glass-tag-border);
  --tag-bg-top: var(--glass-tag-bg-top);
  --tag-bg-bottom: var(--glass-tag-bg-bottom);
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  height: var(--glass-tag-height);
  min-height: var(--glass-tag-height);
  padding: var(--glass-tag-padding);
  border-radius: var(--glass-tag-radius);
  border: 1px solid var(--tag-border);
  background:
    linear-gradient(180deg, var(--tag-bg-top), var(--tag-bg-bottom)),
    radial-gradient(circle at 50% -25%, rgba(206, 225, 251, 0.18), transparent 62%);
  box-shadow: var(--glass-tag-shadow);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--tag-color);
  font-size: var(--glass-tag-font-size);
  font-weight: var(--glass-tag-font-weight);
  letter-spacing: 0.01em;
  line-height: 1;
  white-space: nowrap;
}

.status-tag--bounty,
.status-tag--application,
.status-tag--unknown {
  --tag-color: #c8d7f4;
  --tag-bg-top: rgba(46, 66, 101, 0.72);
  --tag-bg-bottom: rgba(30, 44, 68, 0.66);
  --tag-border: rgba(136, 167, 219, 0.42);
}

.status-tag--recruiting {
  --tag-color: #d3b3ff;
  --tag-bg-top: rgba(88, 62, 138, 0.42);
  --tag-bg-bottom: rgba(63, 42, 105, 0.38);
  --tag-border: rgba(196, 157, 255, 0.48);
}

.status-tag--in_progress {
  --tag-color: #ffd279;
  --tag-bg-top: rgba(120, 90, 33, 0.38);
  --tag-bg-bottom: rgba(88, 64, 24, 0.36);
  --tag-border: rgba(255, 202, 104, 0.42);
}

.status-tag--pending_confirm {
  --tag-color: #9ec5ff;
  --tag-bg-top: rgba(53, 84, 129, 0.4);
  --tag-bg-bottom: rgba(36, 61, 96, 0.36);
  --tag-border: rgba(156, 194, 255, 0.44);
}

.status-tag--completed {
  --tag-color: #67e4b6;
  --tag-bg-top: rgba(33, 101, 79, 0.4);
  --tag-bg-bottom: rgba(22, 73, 58, 0.36);
  --tag-border: rgba(108, 233, 188, 0.42);
}

.status-tag--closed {
  --tag-color: #ffd3d9;
  --tag-bg-top: rgba(121, 58, 74, 0.4);
  --tag-bg-bottom: rgba(88, 41, 55, 0.36);
  --tag-border: rgba(244, 155, 174, 0.44);
}

.status-tag--pending {
  --tag-color: #8caaff;
  --tag-bg-top: rgba(50, 76, 138, 0.4);
  --tag-bg-bottom: rgba(36, 57, 106, 0.38);
  --tag-border: rgba(137, 169, 255, 0.45);
}

.status-tag--accepted {
  --tag-color: #ffe4a8;
  --tag-bg-top: rgba(118, 93, 44, 0.4);
  --tag-bg-bottom: rgba(86, 67, 32, 0.36);
  --tag-border: rgba(255, 214, 137, 0.44);
}

.status-tag--rejected,
.status-tag--withdrawn {
  --tag-color: #ff8ea2;
  --tag-bg-top: rgba(127, 48, 68, 0.38);
  --tag-bg-bottom: rgba(92, 34, 49, 0.34);
  --tag-border: rgba(255, 134, 157, 0.44);
}
</style>
