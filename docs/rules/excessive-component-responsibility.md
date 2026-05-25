# excessive-component-responsibility

Warns when a component looks like it is handling too many responsibilities.

## Why?

High prop, watcher, method, and template complexity often indicates that the component should be split.

## Bad

```vue
<script>
export default {
  props: {
    a: String,
    b: String,
    c: String,
  },
  watch: {
    a() {},
    b() {},
  },
  methods: {
    first() {},
    second() {},
    third() {},
  },
};
</script>
```

## Good

```vue
<script>
export default {
  props: {
    title: String,
  },
  methods: {
    save() {},
  },
};
</script>
```
