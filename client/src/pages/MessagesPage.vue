<template>
  <PageFrame
    :title="meta.title"
    :description="meta.description"
    :content-aria-label="meta.contentAriaLabel"
  >
    <template #default>
      <MessagesPageView />
    </template>
  </PageFrame>
</template>

<script setup>
import PageFrame from "../components/layout/PageFrame.vue";
import MessagesPageView from "../components/messages/MessagesPageView.vue";
import { PAGE_META } from "../utils/constants/pageMeta.js";

const meta = PAGE_META.messages;
</script>
