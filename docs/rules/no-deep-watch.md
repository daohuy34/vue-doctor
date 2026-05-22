
---

## `docs/rules/no-deep-watch.md`

```md
# no-deep-watch

Detects Vue watch() calls using deep: true.

## Why?

Deep watchers recursively track object changes and may significantly impact performance on large objects.

## Bad

```ts
watch(user, () => {}, {
    deep: true
})