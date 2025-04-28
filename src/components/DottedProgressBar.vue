<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  progress: {
    type: Number,
    default: 0,
  },
  max: {
    type: Number,
    default: 100,
  },
  dotCount: {
    type: Number,
    default: 20,
  },
});

// 進捗に基づいてアクティブなドットの数を計算
// Calculate the number of active dots based on progress
const activeDots = computed(() => {
  const percentage = (props.progress / props.max) * 100;
  return Math.floor((percentage / 100) * props.dotCount);
});
</script>

<template>
  <div class="relative w-full">
    <!-- 進捗率表示と線 -->
    <div class="flex items-center">
      <!-- 進捗率表示の丸 -->
      <div
        class="absolute left-0 rounded-full bg-white text-[#222] w-8 h-8 flex items-center justify-center font-bold z-10 shadow-md text-xs"
      >
        {{ props.progress }}%
      </div>

      <!-- ドットのプログレスバー -->
      <div class="w-fit pl-10 flex items-center">
        <div class="flex">
          <div
            v-for="i in props.dotCount"
            :key="i"
            class="h-2 w-2 rounded-full mx-[2px]"
            :class="i <= activeDots ? 'bg-white' : 'bg-white opacity-30'"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 背景色の設定 */
/* Background color settings */
</style>
