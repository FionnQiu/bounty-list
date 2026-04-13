import { reactive } from "vue";

const DEFAULT_DURATION = 2000;
const MAX_VISIBLE = 4;
const TONES = new Set(["success", "error", "info"]);

const state = reactive({
  items: [],
});

let seed = 0;
const timers = new Map();

function normalizeTone(tone) {
  if (TONES.has(tone)) {
    return tone;
  }
  return "info";
}

function removeFeedback(id) {
  const index = state.items.findIndex((item) => item.id === id);
  if (index >= 0) {
    state.items.splice(index, 1);
  }

  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function pushFeedback(message, options = {}) {
  const text = String(message || "").trim();
  if (!text) {
    return null;
  }

  if (state.items.length >= MAX_VISIBLE) {
    const oldest = state.items[0];
    if (oldest) {
      removeFeedback(oldest.id);
    }
  }

  const id = ++seed;
  const duration = DEFAULT_DURATION;
  const tone = normalizeTone(options.tone);

  state.items.push({
    id,
    message: text,
    tone,
  });

  const timer = setTimeout(() => {
    removeFeedback(id);
  }, duration);

  timers.set(id, timer);
  return id;
}

function clearFeedback() {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }
  timers.clear();
  state.items = [];
}

export const feedbackStore = {
  state,
  pushFeedback,
  removeFeedback,
  clearFeedback,
};
