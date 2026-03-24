/**
 * FormFieldRenderer Tests
 * ========================
 * Tests for metadata-driven form field rendering
 */

import { describe, it, expect } from 'vitest'
import { screen, renderWithProviders, fireEvent } from '~/test/utils'
import { FormFieldRenderer } from '~/renderers/fields/FormFieldRenderer'
import { useForm, FormProvider } from 'react-hook-form'
import type { MetaField } from '@afenda/meta-types'

// Wrapper component for testing with react-hook-form
function TestFormWrapper({
  field,
  defaultValue,
}: {
  field: MetaField
  defaultValue?: unknown
}) {
  const form = useForm({
    defaultValues: {
      [field.name]: defaultValue,
    },
  })

  return (
    <FormProvider {...form}>
      <form>
        <FormFieldRenderer field={field} />
      </form>
    </FormProvider>
  )
}

describe('FormFieldRenderer', () => {
  describe('String Fields', () => {
    it('renders text input for string type', () => {
      const field: MetaField = {
        name: 'name',
        label: 'Name',
        type: 'string',
        required: true,
      }

      renderWithProviders(<TestFormWrapper field={field} />)
      expect(screen.getByPlaceholderText(/enter name/i)).toBeInTheDocument()
      expect(screen.getByText(/name/i)).toBeInTheDocument()
    })

    it('renders email input for email type', () => {
      const field: MetaField = {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
      }

      renderWithProviders(<TestFormWrapper field={field} />)
      expect(screen.getByPlaceholderText(/example@domain/i)).toBeInTheDocument()
      const input = screen.getByPlaceholderText(/example@domain/i)
      expect(input).toHaveAttribute('type', 'email')
    })

    it('renders url input for url type', () => {
      const field: MetaField = {
        name: 'website',
        label: 'Website',
        type: 'url',
        required: false,
      }

      renderWithProviders(<TestFormWrapper field={field} />)
      expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument()
      const input = screen.getByPlaceholderText(/https:\/\//i)
      expect(input).toHaveAttribute('type', 'url')
    })
  })

  describe('Number Fields', () => {
    it('renders number input for integer type', () => {
      const field: MetaField = {
        name: 'age',
        label: 'Age',
        type: 'integer',
        required: true,
      }

      renderWithProviders(<TestFormWrapper field={field} />)
      expect(screen.getByText(/age/i)).toBeInTheDocument()
      const input = screen.getByPlaceholderText('0')
      expect(input).toHaveAttribute('type', 'number')
      expect(input).toHaveAttribute('step', '1')
    })

    it('renders number input for float type', () => {
      const field: MetaField = {
        name: 'price',
        label: 'Price',
        type: 'float',
        required: true,
      }

      renderWithProviders(<TestFormWrapper field={field} />)
      expect(screen.getByText(/price/i)).toBeInTheDocument()
      const input = screen.getByPlaceholderText('0')
      expect(input).toHaveAttribute('type', 'number')
      expect(input).toHaveAttribute('step', '0.01')
    })
  })

  describe('Boolean Fields', () => {
    it('renders checkbox for boolean type', () => {
      const field: MetaField = {
        name: 'is_active',
        label: 'Active',
        type: 'boolean',
        required: false,
      }

      renderWithProviders(<TestFormWrapper field={field} defaultValue={false} />)
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
      const labels = screen.getAllByText('Active')
      expect(labels).toHaveLength(2)
      expect(labels[0]).toHaveAttribute('for', checkbox.getAttribute('id'))
      expect(labels[1]).toHaveAttribute('for', checkbox.getAttribute('id'))
      expect(checkbox.getAttribute('id')).toContain('form-field-is_active-')
    })
  })

  describe('Enum Fields', () => {
    it('renders select for enum type', () => {
      const field: MetaField = {
        name: 'status',
        label: 'Status',
        type: 'enum',
        required: true,
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
          { value: 'archived', label: 'Archived' },
        ],
      }

      renderWithProviders(<TestFormWrapper field={field} />)
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
      expect(screen.getByText('Select status...')).toBeInTheDocument()
    })

    it('renders a clear option for non-required enum fields', () => {
      const field: MetaField = {
        name: 'status_optional',
        label: 'Status Optional',
        type: 'enum',
        required: false,
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
        ],
      }

      renderWithProviders(<TestFormWrapper field={field} />)

      const clearOption = document.querySelector('option[value="__none__"]')
      expect(clearOption).toBeInTheDocument()
      expect(clearOption).toHaveTextContent('- Select -')
    })
  })

  describe('Date and Datetime Fields', () => {
    it('renders a time input for datetime fields', () => {
      const field: MetaField = {
        name: 'scheduled_at',
        label: 'Scheduled At',
        type: 'datetime',
        required: false,
      }

      renderWithProviders(<TestFormWrapper field={field} />)

      expect(screen.getByLabelText(/scheduled at/i, { selector: 'button' })).toBeInTheDocument()
      expect(screen.getByLabelText(/scheduled at time/i)).toBeInTheDocument()
    })

    it('accepts manual time entry for datetime fields', () => {
      const field: MetaField = {
        name: 'meeting_at',
        label: 'Meeting At',
        type: 'datetime',
        required: false,
      }

      renderWithProviders(<TestFormWrapper field={field} />)

      const timeInput = screen.getByLabelText(/meeting at time/i)
      fireEvent.change(timeInput, { target: { value: '14:45' } })

      expect(timeInput).toHaveValue('14:45')
    })
  })

  describe('Required Fields', () => {
    it('shows required indicator for required fields', () => {
      const field: MetaField = {
        name: 'required_field',
        label: 'Required Field',
        type: 'string',
        required: true,
      }

      renderWithProviders(<TestFormWrapper field={field} />)
      expect(screen.getByText(/required field/i)).toBeInTheDocument()
    })

    it('applies required and aria-required attributes to text input fields', () => {
      const field: MetaField = {
        name: 'required_text',
        label: 'Required Text',
        type: 'string',
        required: true,
      }

      renderWithProviders(<TestFormWrapper field={field} />)

      const input = screen.getByPlaceholderText(/enter required text/i)
      expect(input).toHaveAttribute('required')
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('applies aria-required to enum trigger fields', () => {
      const field: MetaField = {
        name: 'required_status',
        label: 'Required Status',
        type: 'enum',
        required: true,
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
        ],
      }

      renderWithProviders(<TestFormWrapper field={field} />)

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-required', 'true')
    })
  })

  describe('Read Only Fields', () => {
    it('applies read-only semantics to text input fields', () => {
      const field: MetaField = {
        name: 'readonly_text',
        label: 'Read Only Text',
        type: 'string',
        required: false,
        readonly: true,
      }

      renderWithProviders(<TestFormWrapper field={field} defaultValue={'Locked'} />)

      const input = screen.getByPlaceholderText(/enter read only text/i)
      expect(input).toBeDisabled()
      expect(input).toHaveAttribute('aria-readonly', 'true')
    })

    it('applies read-only semantics to enum trigger fields', () => {
      const field: MetaField = {
        name: 'readonly_status',
        label: 'Read Only Status',
        type: 'enum',
        required: false,
        readonly: true,
        options: [
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
        ],
      }

      renderWithProviders(<TestFormWrapper field={field} defaultValue={'draft'} />)

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-readonly', 'true')
      expect(trigger).toHaveAttribute('data-disabled')
    })
  })

  describe('Help Text', () => {
    it('displays help text when provided', () => {
      const field: MetaField = {
        name: 'field_with_help',
        label: 'Field',
        type: 'string',
        required: false,
        help_text: 'This is helper text',
      }

      renderWithProviders(<TestFormWrapper field={field} />)
      expect(screen.getByText('This is helper text')).toBeInTheDocument()
    })

    it('associates help text with the rendered control via aria-describedby', () => {
      const field: MetaField = {
        name: 'linked_help_field',
        label: 'Linked Help Field',
        type: 'string',
        required: false,
        help_text: 'Shown to screen readers and users',
      }

      renderWithProviders(<TestFormWrapper field={field} />)

      const input = screen.getByPlaceholderText(/enter linked help field/i)
      const help = screen.getByText('Shown to screen readers and users')

      expect(help).toHaveAttribute('id')
      const describedBy = input.getAttribute('aria-describedby')
      expect(describedBy).toContain(help.getAttribute('id'))
      expect(describedBy).toContain('-error')
    })
  })
})
