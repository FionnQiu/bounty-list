<template>
  <PageFrame
    :title="meta.title"
    :description="meta.description"
    :content-aria-label="meta.contentAriaLabel"
  >
    <template #default>
      <BountiesPageView />
    </template>
  </PageFrame>
</template>

<script setup>
import PageFrame from "../components/layout/PageFrame.vue";
import BountiesPageView from "../components/bounties/BountiesPageView.vue";
import { PAGE_META } from "../utils/constants/pageMeta.js";

const meta = PAGE_META.bounties;
</script>
