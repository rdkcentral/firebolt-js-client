<template>
  <span class="deprecation-badge">
    Deprecated in v{{ version }}
  </span>
</template>

<script setup>
const props = defineProps({
  version: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.deprecation-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: #fef2f2;
  color: #b91c1c;
  border: 1px solid #ef4444;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
