# ai-monster-component

Warns when a component appears excessively complex.

## Why?

Large, multi-responsibility components are harder to understand, test, and evolve.

## Bad

```vue
<script>
export default {
  props: {
    a: String,
    b: String,
    c: String,
    d: String,
  },
  computed: {
    one() { return this.a; },
    two() { return this.b; },
    three() { return this.c; },
  },
  watch: {
    a() {},
    b() {},
    c() {},
  },
  methods: {
    first() {},
    second() {},
  },
};
</script>
```

## Good

```vue
<script setup>
const title = ref('hello');
</script>

<template>
  <div>{{ title }}</div>
</template>
```
