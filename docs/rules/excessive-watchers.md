# excessive-watchers

Warn when a component declares too many watchers.

## Why?

Too many watchers often indicate duplicated logic or a component that is doing more than one job.

## Default

- `maxWatchers: 10`

## Bad

```ts
watchEffect(() => {});
watchEffect(() => {});
watchEffect(() => {});
watchEffect(() => {});
watchEffect(() => {});
watchEffect(() => {});
watchEffect(() => {});
watchEffect(() => {});
watchEffect(() => {});
watchEffect(() => {});
watchEffect(() => {});
```

## Good

```ts
watchEffect(() => {
  // one focused side-effect
});
```
