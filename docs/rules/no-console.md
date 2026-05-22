# no-console

Detects console usage in application code.

## Why?

Console statements are often forgotten in production code and may expose internal information.

## Bad

```js
console.log(user)
console.error(err)