/**
 * Utils Tests
 * ============
 * Tests for utility functions
 */

import { describe, it, expect } from 'vitest'
import { cn } from '~/lib/utils'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    // eslint-disable-next-line no-constant-binary-expression
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('deduplicates Tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles array of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('handles objects with boolean values', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('merges conflicting Tailwind utilities correctly', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('handles undefined and null values', () => {
    expect(cn('foo', undefined, 'bar', null)).toBe('foo bar')
  })

  it('combines clsx and tailwind-merge behavior', () => {
    expect(
      cn('px-2 py-1', { 'bg-red-500': true }, ['text-sm'], 'px-4')
    ).toBe('py-1 bg-red-500 text-sm px-4')
  })
})
