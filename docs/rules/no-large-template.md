# no-large-template

Warn when a template is too large.

## Why?

Large templates are harder to review, test, and refactor.

## Defaults

- `maxLines: 500`
- `maxNodes: 300`

## Bad

A template with hundreds of repeated nodes or many lines.

## Good

Keep large UI sections in child components.
