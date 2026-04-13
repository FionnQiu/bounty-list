<template>
  <PageFrame
    :title="meta.title"
    :description="meta.description"
    :content-aria-label="meta.contentAriaLabel"
  >
    <template #default>
      <WorkbenchPageView />
    </template>
  </PageFrame>
</template>

<script setup>
import PageFrame from "../components/layout/PageFrame.vue";
import WorkbenchPageView from "../components/workbench/WorkbenchPageView.vue";
import { PAGE_META } from "../utils/constants/pageMeta.js";

const meta = PAGE_META.workbench;
</script>
