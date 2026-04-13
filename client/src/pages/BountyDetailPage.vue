<template>
  <PageFrame
    :title="meta.title"
    :description="meta.description"
    :content-aria-label="meta.contentAriaLabel"
  >
    <template #default>
      <BountyDetailPageView />
    </template>
  </PageFrame>
</template>

<script setup>
import PageFrame from "../components/layout/PageFrame.vue";
import BountyDetailPageView from "../components/bounty-detail/BountyDetailPageView.vue";
import { PAGE_META } from "../utils/constants/pageMeta.js";

const meta = PAGE_META.bountyDetail;
</script>
