# @afenda/ui

Shared UI component library for AFENDA Meta UI.

## Overview

This package provides a collection of React components built with:
- **shadcn/ui** - Quality component patterns
- **Radix UI** - Accessible primitives
- **Tailwind CSS** - Utility-first styling
- **CVA** - Class variance authority for variants

## Components

### Form Components
- `Button` - Primary action buttons with variants
- `Input` - Text input with validation states
- `Textarea` - Multi-line text input
- `Checkbox` - Boolean selection
- `Select` - Dropdown selection
- `Calendar` - Date picker
- `Form` - react-hook-form integration

### Layout Components
- `Card` - Content containers
- `Separator` - Visual dividers
- `Tabs` - Tabbed interfaces
- `Sheet` - Side panels
- `Dialog` - Modal dialogs
- `AlertDialog` - Confirmation dialogs
- `Popover` - Floating content

### Data Display
- `Table` - Data tables
- `Badge` - Status indicators
- `Avatar` - User avatars
- `Skeleton` - Loading placeholders
- `Tooltip` - Contextual help

### Feedback
- `Sonner` - Toast notifications
- `Command` - Command palette
- `DropdownMenu` - Context menus

## Usage

```tsx
import { Button, Input, Card } from '@afenda/ui';

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text..." />
      <Button variant="default">Submit</Button>
    </Card>
  );
}
```

## Styling

Import the styles in your app:

```tsx
import '@afenda/ui/styles.css';
```

## Development

```bash
# Build the package
pnpm build

# Type checking
pnpm typecheck

# Watch mode
pnpm dev
```

## Dependencies

This package has peer dependencies that must be installed in the consuming application:
- react
- react-dom
- lucide-react
- radix-ui
- date-fns
- react-day-picker
- react-hook-form
- next-themes
- cmdk
- sonner
