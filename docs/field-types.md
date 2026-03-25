# Field Types

This guide documents the primary metadata field types used by the web renderer and their behavior.

## Core Primitive Types

- `string`, `text`, `email`, `url`, `phone`
- `integer`, `float`, `currency`
- `boolean`, `enum`
- `date`, `datetime`
- `json`, `color`, `rating`, `richtext`, `tags`

## Relation Types

- `many2one`: searchable relation picker with remote options fetch
- `many2many`: multi-select relation picker with badges and removal
- `one2many`: embedded row editor for nested records

## Asset Types

- `file`: upload file to `/api/uploads?kind=file` and store returned URL
- `image`: upload image to `/api/uploads?kind=image`, store URL, and render preview

## Validation + Accessibility

- Required fields apply `required` and `aria-required`
- Read-only fields apply `disabled`/`aria-readonly` semantics
- Help text and errors are linked with `aria-describedby`

## Notes

- Relation fields require `field.relation` metadata (`model`, `value_field`, `display_field`)
- `currency` fields format display in UI while preserving numeric payloads
- Upload fields depend on the backend uploads endpoint contract returning `{ url: string }`
