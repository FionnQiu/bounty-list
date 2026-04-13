<template>
  <PageFrame
    :title="meta.title"
    :description="meta.description"
    :content-aria-label="meta.contentAriaLabel"
  >
    <template #default>
      <AuthPageView />
    </template>
  </PageFrame>
</template>

<script setup>
import PageFrame from "../components/layout/PageFrame.vue";
import AuthPageView from "../components/auth/AuthPageView.vue";
import { PAGE_META } from "../utils/constants/pageMeta.js";

const meta = PAGE_META.login;
</script>
