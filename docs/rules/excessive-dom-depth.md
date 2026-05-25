# excessive-dom-depth

Warn when template nesting exceeds a threshold.

## Why?

Deeply nested markup is harder to scan and often signals overcomplicated layout.

## Default

- `maxDepth: 6`

## Bad

```html
<div>
  <div>
    <div>
      <div>
        <div>
          <div>
            <div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

## Good

```html
<div>
  <section>
    <article></article>
  </section>
</div>
```
