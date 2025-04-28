<script setup lang="ts">
import { computed } from "vue";

// propsの型定義
// Type definition for props
interface ServerResponseItem {
  id?: string | number;
  name?: string;
  url?: string;
  error?: string;
  img_url?: string;
  tags?: string[];
  [key: string]: unknown;
}

interface Props {
  conversationSummary: string;
  conversationFinished: boolean;
  serverResponse: ServerResponseItem | ServerResponseItem[] | null;
}

const props = defineProps<Props>();

// serverResponseが配列かどうかをチェックする関数
// Function to check if serverResponse is an array
function isResponseArray(
  response: Props["serverResponse"],
): response is ServerResponseItem[] {
  return Array.isArray(response);
}

// 単一のレスポンスの場合は配列に変換する関数
// Function to convert single response to array
function normalizeResponse(
  response: Props["serverResponse"],
): ServerResponseItem[] {
  if (!response) return [];
  if (isResponseArray(response)) return response;
  return [response];
}

const filteredResponse = computed(() => {
  return normalizeResponse(props.serverResponse).slice(0, 5);
});

// tags を重複しないように抽出
// Extract tags without duplicates
const uniqueTags = computed(() => {
  return [
    ...new Set(filteredResponse.value.flatMap((item) => item.tags || [])),
  ];
});
</script>

<template>
  <div class="h-full flex flex-col gap-8 w-full pt-8">
    <!-- サーバーレスポンス表示部分 -->
    <div class="flex flex-row flex-wrap gap-2">
      <div
        v-for="(item, index) in filteredResponse"
        :key="item.id || index"
        class="flex flex-col w-[calc(20%-8px)]"
      >
        <div
          v-if="item.name"
          class="text-2xl font-semibold mb-2 text-center text-white"
        >
          {{ item.name }}
        </div>
        <img
          v-if="item.img_url"
          :src="item.img_url"
          alt="Response Image"
          class="rounded-[1000px] w-full aspect-square"
        />
        <div v-if="item.error" class="text-red-500 mb-2">
          {{ item.error }}
        </div>
      </div>
    </div>

    <!-- 会話要約（完了後のみ表示） -->
    <div class="gap-12 flex flex-col text-white pb-8">
      <div class="gap-2 flex flex-row text-white">
        <h2 class="text-lg font-semibold mb-2 whitespace-nowrap">
          Your interests
        </h2>
        <div class="flex flex-row gap-2 flex-wrap">
          <div
            v-for="tag in uniqueTags"
            :key="tag"
            class="text-sm px-4 py-2 border border-white border-solid"
          >
            {{ tag }}
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-8">
        <div class="font-medium text-3xl">Major Problems in Education</div>
        <ol class="list-decimal pl-5 space-y-2">
          <li class="">
            <span class="text-2xl font-semibold"
              >Declining Academic Performance</span
            >
            <p class="text-sm">
              Reading and math scores are at their lowest in decades, with many
              students performing below grade level, especially in
              under-resourced communities.
            </p>
          </li>
          <li class="">
            <span class="text-2xl font-semibold"
              >Teacher Shortages and Underqualification</span
            >
            <p class="text-sm">
              There is a severe shortage of qualified teachers, leading to
              larger class sizes, increased use of underqualified staff, and
              lower teaching quality.
            </p>
          </li>
          <li class="">
            <span class="text-2xl font-semibold"
              >Insufficient Funding and Resources</span
            >
            <p class="text-sm">
              Many schools face chronic underfunding, resulting in outdated
              materials, poor infrastructure, and limited access to essential
              programs.
            </p>
          </li>
          <li class="">
            <span class="text-2xl font-semibold"
              >Mental Health and Well-being</span
            >
            <p class="text-sm">
              Rates of student mental health issues, absenteeism, bullying, and
              school violence are rising, placing additional strain on students
              and educators.
            </p>
          </li>
          <li class="">
            <span class="text-2xl font-semibold"
              >Achievement Gaps and Inequity</span
            >
            <p class="text-sm">
              Disparities in educational outcomes based on income, race, and
              special needs are widening, with low-income and minority students
              disproportionately affected.
            </p>
          </li>
          <li class="">
            <span class="text-2xl font-semibold"
              >Outdated Curricula and Teaching Methods</span
            >
            <p class="text-sm">
              Many curricula are not aligned with modern needs, lack coherence,
              or are overly focused on standardized testing rather than critical
              thinking or real-world skills.
            </p>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>
