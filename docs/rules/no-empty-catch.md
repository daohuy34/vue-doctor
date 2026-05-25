# no-empty-catch

Disallow empty `catch` blocks.

## Why?

An empty `catch` swallows errors and makes production failures much harder to debug.

## Bad

```js
try {
  doSomething();
} catch (error) {
}
```

## Good

```js
try {
  doSomething();
} catch (error) {
  console.error(error);
}
```
