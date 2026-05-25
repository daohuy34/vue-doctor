# no-document-in-ssr

Detects `document` usage in SSR-sensitive code.

## Why?

`document` is not available during server-side rendering and will throw at runtime.

## Bad

```ts
const node = document.querySelector('#app');
```

## Good

```ts
if (process.client) {
    const node = document.querySelector('#app');
}
```
