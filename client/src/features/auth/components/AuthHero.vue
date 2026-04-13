<script setup>
defineProps({
  text: { type: Object, required: true },
});
</script>

<template>
  <header class="hero-copy">
    <p class="hero-copy__brand">{{ text.brand }}</p>
    <h1>{{ text.title }}</h1>
    <p class="hero-copy__subtitle">{{ text.subtitle }}</p>
    <div class="hero-copy__keywords" aria-hidden="true">
      <span v-for="keyword in text.keywords" :key="keyword">{{ keyword }}</span>
    </div>
  </header>
</template>

<style scoped>
.hero-copy {
  display: grid;
  gap: 8px;
  text-align: center;
}

.hero-copy__brand {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(211, 227, 255, 0.8);
}

.hero-copy h1 {
  margin: 0;
  color: #f5f9ff;
  font-size: clamp(1.92rem, 3.5vw, 2.5rem);
  letter-spacing: 0.02em;
  line-height: 1.16;
}

.hero-copy__subtitle {
  margin: 0;
  color: rgba(214, 226, 247, 0.9);
  font-size: clamp(13px, 2vw, 14px);
}

.hero-copy__keywords {
  display: inline-flex;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
}

.hero-copy__keywords span {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(153, 184, 237, 0.42);
  background: rgba(26, 41, 67, 0.48);
  color: rgba(221, 234, 255, 0.9);
  font-size: 11px;
  letter-spacing: 0.06em;
}

@media (max-width: 560px) {
  .hero-copy h1 {
    font-size: clamp(1.56rem, 8vw, 1.92rem);
  }

  .hero-copy__keywords {
    flex-wrap: wrap;
  }
}
</style>
