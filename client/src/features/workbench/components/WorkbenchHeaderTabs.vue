<script setup>
defineProps({
  tabItems: { type: Array, default: () => [] },
  activeTab: { type: String, default: "published" },
});

const emit = defineEmits(["switch"]);

function handleSwitch(tabKey) {
  emit("switch", tabKey);
}
</script>

<template>
  <nav class="workbench-tabs" role="tablist" aria-label="工作台分区">
    <button
      v-for="tab in tabItems"
      :key="tab.key"
      :class="['workbench-tab', { 'is-active': activeTab === tab.key }]"
      type="button"
      role="tab"
      :aria-selected="activeTab === tab.key"
      @click="handleSwitch(tab.key)"
    >
      <span>{{ tab.label }}</span>
      <strong>{{ tab.count }}</strong>
    </button>
  </nav>
</template>

<style scoped>
.workbench-tabs {
  display: flex;
  gap: var(--space-2);
}

.workbench-tab {
  min-height: 38px;
  border: 1px solid var(--line-soft);
  border-radius: 999px;
  background: rgba(23, 35, 56, 0.84);
  color: var(--text-secondary);
  padding: 0 var(--space-4);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.workbench-tab strong {
  font-variant-numeric: tabular-nums;
}

.workbench-tab.is-active {
  border-color: rgba(132, 166, 255, 0.54);
  background: rgba(106, 141, 255, 0.24);
  color: #e8f0ff;
}

@media (max-width: 900px) {
  .workbench-tabs {
    overflow-x: auto;
    padding-bottom: 2px;
  }
}

@media (max-width: 768px) {
  .workbench-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workbench-tab {
    justify-content: space-between;
    width: 100%;
  }
}

@media (max-width: 560px) {
  .workbench-tabs {
    gap: 8px;
  }

  .workbench-tab {
    min-height: 42px;
    padding: 0 12px;
  }
}
</style>
