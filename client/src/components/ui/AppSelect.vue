<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useEscapeKey } from "../../composables/useEscapeKey.js";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: "",
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: "请选择",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const rootRef = ref(null);
const menuRef = ref(null);
const isOpen = ref(false);
const highlightedIndex = ref(-1);

const selectId = `app-select-${Math.random().toString(36).slice(2, 10)}`;
const listboxId = `${selectId}-listbox`;

const normalizedOptions = computed(() =>
  (props.options || []).map((option, index) => ({
    key: `${String(option?.value ?? "")}-${index}`,
    value: String(option?.value ?? ""),
    label: String(option?.label ?? option?.value ?? ""),
    disabled: Boolean(option?.disabled),
    isPlaceholder: false,
  })),
);

const allOptions = computed(() => [
  {
    key: "__placeholder__",
    value: "",
    label: props.placeholder,
    disabled: false,
    isPlaceholder: true,
  },
  ...normalizedOptions.value,
]);

const selectedValue = computed(() => String(props.modelValue ?? ""));

const selectedIndex = computed(() =>
  allOptions.value.findIndex((option) => option.value === selectedValue.value),
);

const selectedOption = computed(() => {
  const index = selectedIndex.value;
  return index >= 0 ? allOptions.value[index] : null;
});

const selectedLabel = computed(() => selectedOption.value?.label || props.placeholder);

const activeDescendant = computed(() =>
  isOpen.value && highlightedIndex.value >= 0 ? `${selectId}-option-${highlightedIndex.value}` : undefined,
);

function syncHighlightToSelected() {
  highlightedIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0;
}

function openMenu() {
  if (props.disabled || isOpen.value) {
    return;
  }

  isOpen.value = true;
  syncHighlightToSelected();
  scrollHighlightedIntoView();
}

function closeMenu() {
  if (!isOpen.value) {
    return;
  }

  isOpen.value = false;
  highlightedIndex.value = -1;
}

function toggleMenu() {
  if (isOpen.value) {
    closeMenu();
    return;
  }

  openMenu();
}

function emitSelection(option) {
  if (!option || option.disabled) {
    return;
  }

  const nextValue = String(option.value ?? "");
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
  closeMenu();
}

function moveHighlight(step) {
  if (!allOptions.value.length) {
    highlightedIndex.value = -1;
    return;
  }

  let cursor = highlightedIndex.value;
  if (cursor < 0) {
    cursor = selectedIndex.value >= 0 ? selectedIndex.value : 0;
  }

  for (let count = 0; count < allOptions.value.length; count += 1) {
    cursor = (cursor + step + allOptions.value.length) % allOptions.value.length;
    if (!allOptions.value[cursor].disabled) {
      highlightedIndex.value = cursor;
      break;
    }
  }

  scrollHighlightedIntoView();
}

function scrollHighlightedIntoView() {
  nextTick(() => {
    if (!menuRef.value || highlightedIndex.value < 0) {
      return;
    }

    const active = menuRef.value.querySelector(`[data-option-index='${highlightedIndex.value}']`);
    active?.scrollIntoView({ block: "nearest" });
  });
}

function onRootKeydown(event) {
  if (props.disabled) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!isOpen.value) {
      openMenu();
      return;
    }
    moveHighlight(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!isOpen.value) {
      openMenu();
      return;
    }
    moveHighlight(-1);
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!isOpen.value) {
      openMenu();
      return;
    }
    emitSelection(allOptions.value[highlightedIndex.value]);
    return;
  }

  if (event.key === "Tab") {
    closeMenu();
  }
}

function onDocumentPointerDown(event) {
  if (!isOpen.value || !rootRef.value) {
    return;
  }

  if (!rootRef.value.contains(event.target)) {
    closeMenu();
  }
}

watch(
  () => props.modelValue,
  () => {
    if (isOpen.value) {
      syncHighlightToSelected();
      scrollHighlightedIntoView();
    }
  },
);

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      closeMenu();
    }
  },
);

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown);
});

useEscapeKey(() => {
  if (isOpen.value) {
    closeMenu();
  }
});
</script>

<template>
  <div
    ref="rootRef"
    class="app-select"
    :class="{ 'is-open': isOpen, 'is-disabled': disabled }"
    @keydown="onRootKeydown"
  >
    <button
      class="app-select__control form-input"
      type="button"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      :aria-activedescendant="activeDescendant"
      aria-haspopup="listbox"
      :disabled="disabled"
      @click="toggleMenu"
    >
      <span class="app-select__value" :class="{ 'is-placeholder': selectedValue === '' }">{{ selectedLabel }}</span>
      <span class="app-select__arrow" aria-hidden="true"></span>
    </button>

    <Transition name="app-select-fade">
      <div v-if="isOpen" :id="listboxId" ref="menuRef" class="app-select__menu" role="listbox">
        <button
          v-for="(option, index) in allOptions"
          :id="`${selectId}-option-${index}`"
          :key="option.key"
          class="app-select__option"
          :class="{
            'is-selected': option.value === selectedValue,
            'is-highlighted': highlightedIndex === index,
            'is-placeholder': option.isPlaceholder,
          }"
          type="button"
          role="option"
          :aria-selected="option.value === selectedValue"
          :data-option-index="index"
          @mouseenter="highlightedIndex = index"
          @click="emitSelection(option)"
        >
          <span class="app-select__option-label">{{ option.label }}</span>
          <span v-if="option.value === selectedValue" class="app-select__check" aria-hidden="true">✓</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app-select {
  width: 100%;
  position: relative;
}

.app-select.is-open {
  z-index: 950;
}

.app-select__control {
  position: relative;
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  text-align: left;
  border: 1px solid var(--select-border);
  border-radius: var(--radius-sm);
  background:
    linear-gradient(180deg, rgba(30, 45, 69, 0.92), rgba(18, 29, 46, 0.9)),
    radial-gradient(circle at 92% 50%, rgba(126, 160, 255, 0.12), transparent 48%);
  box-shadow:
    inset 0 1px 0 rgba(186, 209, 245, 0.1),
    0 8px 18px rgba(3, 8, 18, 0.28);
  cursor: pointer;
  transition:
    border-color var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard),
    background-color var(--duration-fast) var(--ease-standard);
}

.app-select__control:hover:not(:disabled) {
  border-color: var(--select-border-hover);
  box-shadow:
    inset 0 1px 0 rgba(194, 216, 248, 0.12),
    0 10px 22px rgba(3, 8, 18, 0.32);
}

.app-select.is-open .app-select__control {
  border-color: var(--primary);
  box-shadow:
    0 0 0 4px rgba(106, 141, 255, 0.24),
    inset 0 1px 0 rgba(205, 225, 252, 0.14),
    0 10px 24px rgba(6, 14, 28, 0.38);
}

.app-select__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-weight: 600;
}

.app-select__value.is-placeholder {
  color: #8ca2c4;
  font-weight: 500;
}

.app-select__arrow {
  width: 9px;
  height: 9px;
  border-right: 2px solid var(--select-arrow);
  border-bottom: 2px solid var(--select-arrow);
  transform: rotate(45deg) translateY(-1px);
  transition: transform var(--duration-fast) var(--ease-standard);
  flex-shrink: 0;
}

.app-select.is-open .app-select__arrow {
  transform: rotate(-135deg) translateY(-1px);
}

.app-select__menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  z-index: 980;
  max-height: min(280px, 40vh);
  overflow: auto;
  padding: 8px;
  border-radius: calc(var(--radius-sm) + 2px);
  border: 1px solid rgba(130, 164, 229, 0.46);
  background:
    linear-gradient(180deg, rgba(18, 29, 46, 0.96), rgba(13, 21, 34, 0.95)),
    radial-gradient(circle at 12% 0%, rgba(130, 164, 229, 0.16), transparent 50%);
  box-shadow:
    0 20px 44px rgba(2, 8, 18, 0.58),
    inset 0 1px 0 rgba(193, 215, 246, 0.12);
  backdrop-filter: blur(calc(var(--glass-blur) + 4px)) saturate(132%);
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) + 4px)) saturate(132%);
}

.app-select__option {
  width: 100%;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--duration-fast) var(--ease-standard),
    background-color var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard);
}

.app-select__option + .app-select__option {
  margin-top: 4px;
}

.app-select__option.is-highlighted {
  color: var(--text-primary);
  border-color: rgba(126, 160, 255, 0.42);
  background: rgba(46, 66, 102, 0.62);
  box-shadow: inset 0 1px 0 rgba(193, 216, 248, 0.08);
}

.app-select__option.is-selected {
  color: #e8f0ff;
  border-color: rgba(126, 160, 255, 0.56);
  background: rgba(106, 141, 255, 0.24);
}

.app-select__option.is-placeholder:not(.is-selected) {
  color: #97acd0;
}

.app-select__option-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-select__check {
  color: #dce7ff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.app-select.is-disabled .app-select__control {
  cursor: not-allowed;
  opacity: 0.64;
  box-shadow: none;
}

.app-select-fade-enter-active,
.app-select-fade-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);
}

.app-select-fade-enter-from,
.app-select-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .app-select__control,
  .app-select__option,
  .app-select-fade-enter-active,
  .app-select-fade-leave-active {
    transition: none;
  }
}
</style>
