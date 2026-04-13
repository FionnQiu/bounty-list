<script setup>
import { RouterView } from "vue-router";
import AppLayout from "./components/AppLayout.vue";

function usesAppLayout(route) {
  return (route.meta?.layout || "app") === "app";
}

function getRouteTransition(route) {
  return route.meta?.transition || "route-fade";
}

function getRouteKey(route) {
  return route.meta?.transitionKey || route.path;
}
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <div class="route-stage">
      <AppLayout v-if="usesAppLayout(route)" class="route-layout">
        <Transition :name="getRouteTransition(route)" mode="out-in">
          <div :key="getRouteKey(route)" class="route-content">
            <component :is="Component" />
          </div>
        </Transition>
      </AppLayout>

      <Transition v-else :name="getRouteTransition(route)" mode="out-in">
        <div :key="getRouteKey(route)" class="route-content route-content--public">
          <component :is="Component" />
        </div>
      </Transition>
    </div>
  </RouterView>
</template>
