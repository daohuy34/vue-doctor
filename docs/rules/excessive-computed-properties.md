# excessive-computed-properties

Warn when a component declares too many computed properties.

## Why?

Many computed properties increase cognitive load and make components harder to maintain.

## Default

- `maxComputed: 20`

## Bad

```js
export default {
  computed: {
    a() { return 1; },
    b() { return 2; },
    c() { return 3; },
    d() { return 4; },
    e() { return 5; },
    f() { return 6; },
    g() { return 7; },
    h() { return 8; },
    i() { return 9; },
    j() { return 10; },
    k() { return 11; },
    l() { return 12; },
    m() { return 13; },
    n() { return 14; },
    o() { return 15; },
    p() { return 16; },
    q() { return 17; },
    r() { return 18; },
    s() { return 19; },
    t() { return 20; },
    u() { return 21; },
  },
};
```

## Good

```js
export default {
  computed: {
    title() {
      return this.name.toUpperCase();
    },
  },
};
```
