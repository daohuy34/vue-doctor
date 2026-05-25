# excessive-reactive-state

Warns when a component declares too much reactive state.

## Why?

A single component with many local reactive values tends to become hard to reason about and maintain.

## Bad

```ts
const a = ref(1);
const b = ref(2);
const c = ref(3);
const d = ref(4);
const e = ref(5);
```

## Good

```ts
const user = reactive({ name: 'Ada' });
const count = ref(1);
```
