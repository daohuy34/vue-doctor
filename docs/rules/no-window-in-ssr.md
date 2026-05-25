
# no-window-in-ssr

Detects `window` usage in SSR-sensitive code.

## Why?

`window` is not available during server-side rendering and will throw at runtime.

## Bad

```ts
const href = window.location.href;
```

## Good

```ts
if (process.client) {
    const href = window.location.href;
}
```