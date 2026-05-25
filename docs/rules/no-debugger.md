# no-debugger

Disallow `debugger` statements in Vue components.

## Why?

`debugger` statements are useful during local debugging, but they should never ship to production.

## Bad

```js
debugger;
```

## Good

```js
const value = 1;
```
