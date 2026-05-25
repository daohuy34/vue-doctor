# excessive-props

Warn when a component declares too many props.

## Why?

A large prop surface usually means the component is taking on too much responsibility.

## Default

- `maxProps: 15`

## Bad

```ts
defineProps({
  a: String,
  b: String,
  c: String,
  d: String,
  e: String,
  f: String,
  g: String,
  h: String,
  i: String,
  j: String,
  k: String,
  l: String,
  m: String,
  n: String,
  o: String,
  p: String,
});
```

## Good

```ts
defineProps({
  title: String,
  modelValue: String,
});
```
