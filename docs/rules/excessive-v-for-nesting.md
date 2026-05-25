# excessive-v-for-nesting

Warn when templates contain too many nested `v-for` loops.

## Why?

Nested loops increase render complexity and make the template harder to understand.

## Default

- `maxNesting: 3`

## Bad

```html
<div v-for="a in items">
  <div v-for="b in items">
    <div v-for="c in items">
      <div v-for="d in items"></div>
    </div>
  </div>
</div>
```

## Good

```html
<div v-for="item in items">
  <ChildComponent :item="item" />
</div>
```
