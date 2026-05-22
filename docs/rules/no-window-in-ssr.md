
---

## `docs/rules/no-window-in-ssr.md`

```md
# no-window-in-ssr

Detects browser APIs used outside client-only contexts.

## Why?

window, document and localStorage are unavailable during SSR rendering.

## Bad

```ts
const theme =
    localStorage.getItem('theme')