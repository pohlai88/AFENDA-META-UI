/**
 * Button Component Tests
 * =======================
 * Tests for shadcn Button component with variants
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, user } from '~/test/utils'
import { Button } from '~/components/ui/button'

describe('Button', () => {
  it('renders with text content', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('applies default variant styles', () => {
    render(<Button>Default</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')
  })

  it('applies secondary variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-secondary')
  })

  it('applies destructive variant styles', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive/10')
    expect(button).toHaveClass('text-destructive')
  })

  it('applies outline variant styles', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('border')
  })

  it('applies ghost variant styles', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('hover:bg-muted')
    expect(button).toHaveClass('hover:text-foreground')
  })

  it('applies size variants', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-7')
    expect(screen.getByRole('button')).toHaveClass('text-[0.8rem]')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-9')
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    
    const button = screen.getByRole('button')
    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    expect(screen.getByRole('link')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/test')
  })
})
