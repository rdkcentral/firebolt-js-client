<template>
  <span class="status-badge" :class="statusClass">{{ statusText }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => ['stable', 'experimental', 'deprecated'].includes(value)
  }
})

const statusClass = computed(() => `status-badge-${props.status}`)
const statusText = computed(() => props.status.charAt(0).toUpperCase() + props.status.slice(1))
</script>

<style scoped>
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge-stable {
  background-color: #e6fffa;
  color: #047857;
  border: 1px solid #10b981;
}

.status-badge-experimental {
  background-color: #fffbeb;
  color: #b45309;
  border: 1px solid #f59e0b;
}

.status-badge-deprecated {
  background-color: #fef2f2;
  color: #b91c1c;
  border: 1px solid #ef4444;
}
</style>
