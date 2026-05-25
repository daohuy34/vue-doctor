# no-sessionstorage-in-ssr

Detects `sessionStorage` usage in SSR-sensitive code.

## Why?

`sessionStorage` is not available during server-side rendering and will throw at runtime.

## Bad

```ts
const token = sessionStorage.getItem('token');
```

## Good

```ts
if (process.client) {
    const token = sessionStorage.getItem('token');
}
```
