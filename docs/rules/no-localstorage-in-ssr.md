# no-localstorage-in-ssr

Detects `localStorage` usage in SSR-sensitive code.

## Why?

`localStorage` is not available during server-side rendering and will throw at runtime.

## Bad

```ts
const theme = localStorage.getItem('theme');
```

## Good

```ts
if (process.client) {
    const theme = localStorage.getItem('theme');
}
```
