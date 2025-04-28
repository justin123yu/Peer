<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";

const props = defineProps({
  isActive: {
    type: Boolean,
    default: false,
  },
});

const circleSize = ref(60);
const minSize = 50;
const maxSize = 70;
const sizeStep = 0.5;
const growing = ref(true);
const waves = ref<{ size: number; opacity: number }[]>([]);
const animationFrameId = ref(0);

// Animation to change circle size
const animateCircleSize = () => {
  if (props.isActive) {
    if (growing.value) {
      circleSize.value += sizeStep;
      if (circleSize.value >= maxSize) {
        growing.value = false;
      }
    } else {
      circleSize.value -= sizeStep;
      if (circleSize.value <= minSize) {
        growing.value = true;
      }
    }
  } else {
    // Return to standard size when inactive
    if (circleSize.value > 60) {
      circleSize.value -= sizeStep;
    } else if (circleSize.value < 60) {
      circleSize.value += sizeStep;
    }
  }

  // Add and update ripple effects
  if (props.isActive && Math.random() < 0.05) {
    waves.value.push({ size: circleSize.value, opacity: 0.6 });
  }

  // Update ripple animation
  waves.value = waves.value
    .map((wave) => ({
      size: wave.size + 1.2,
      opacity: wave.opacity - 0.01,
    }))
    .filter((wave) => wave.opacity > 0);

  animationFrameId.value = requestAnimationFrame(animateCircleSize);
};

// Monitor changes in active state
watch(
  () => props.isActive,
  (newValue) => {
    if (newValue) {
      if (!animationFrameId.value) {
        animationFrameId.value = requestAnimationFrame(animateCircleSize);
      }
    }
  },
);

onMounted(() => {
  animationFrameId.value = requestAnimationFrame(animateCircleSize);
});

onUnmounted(() => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
  }
});
</script>

<template>
  <div class="relative flex items-center justify-center">
    <!-- 波紋エフェクト -->
    <div
      v-for="(wave, index) in waves"
      :key="`wave-${index}`"
      class="absolute rounded-full border-2 border-[#F9F7F1]"
      :style="{
        width: `${wave.size}px`,
        height: `${wave.size}px`,
        opacity: wave.opacity,
        transform: `translate(-50%, -50%)`,
        left: '50%',
        top: '50%',
      }"
    ></div>

    <!-- メインの円 -->
    <div
      class="relative rounded-full bg-[#F9F7F1] transition-colors"
      :style="{
        width: `${circleSize}px`,
        height: `${circleSize}px`,
      }"
    ></div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>
