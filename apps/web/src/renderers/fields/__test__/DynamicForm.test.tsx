import { describe, expect, it, vi } from "vitest";
import { fireEvent, renderWithProviders, screen } from "~/test/utils";
import { DynamicForm } from "~/renderers/fields/DynamicForm";
import type { FieldConfig } from "~/renderers/fields";

describe("DynamicForm array fields", () => {
  it("allows adding, editing, and removing array items", () => {
    const onSubmit = vi.fn();

    const fields: FieldConfig[] = [
      {
        type: "array",
        name: "contacts",
        label: "Contacts",
        itemLabel: "Contact",
        fields: [
          {
            type: "string",
            name: "name",
            label: "Name",
            required: true,
          },
        ],
      },
    ];

    renderWithProviders(<DynamicForm fields={fields} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));

    // New item is validated immediately after add.
    expect(screen.getByText("This field is required.")).toBeInTheDocument();

    const nameInput = screen.getByRole("textbox");
    fireEvent.change(nameInput, { target: { value: "Alice" } });

    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        contacts: [{ name: "Alice" }],
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("allows moving array items up and down", () => {
    const onSubmit = vi.fn();

    const fields: FieldConfig[] = [
      {
        type: "array",
        name: "contacts",
        label: "Contacts",
        itemLabel: "Contact",
        fields: [
          {
            type: "string",
            name: "name",
            label: "Name",
            required: true,
          },
        ],
      },
    ];

    renderWithProviders(<DynamicForm fields={fields} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));
    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));

    const nameInputs = screen.getAllByRole("textbox");
    fireEvent.change(nameInputs[0], { target: { value: "Alice" } });
    fireEvent.change(nameInputs[1], { target: { value: "Bob" } });

    fireEvent.click(screen.getByRole("button", { name: /move contact 1 down/i }));

    expect(screen.getByText("Moved Contact 1 to position 2.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        contacts: [{ name: "Bob" }, { name: "Alice" }],
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /move contact 2 up/i }));
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contacts: [{ name: "Alice" }, { name: "Bob" }],
      })
    );
  });

  it("supports keyboard reordering with Alt+Arrow keys", () => {
    const onSubmit = vi.fn();

    const fields: FieldConfig[] = [
      {
        type: "array",
        name: "contacts",
        label: "Contacts",
        itemLabel: "Contact",
        fields: [
          {
            type: "string",
            name: "name",
            label: "Name",
            required: true,
          },
        ],
      },
    ];

    renderWithProviders(<DynamicForm fields={fields} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));
    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));

    const nameInputs = screen.getAllByRole("textbox");
    fireEvent.change(nameInputs[0], { target: { value: "Alice" } });
    fireEvent.change(nameInputs[1], { target: { value: "Bob" } });

    fireEvent.keyDown(screen.getByRole("button", { name: /move contact 1 down/i }), {
      key: "ArrowDown",
      altKey: true,
    });

    expect(screen.getByText("Moved Contact 1 to position 2.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        contacts: [{ name: "Bob" }, { name: "Alice" }],
      })
    );
  });

  it("uses explicit default values when adding array items", () => {
    const onSubmit = vi.fn();

    const fields: FieldConfig[] = [
      {
        type: "array",
        name: "contacts",
        label: "Contacts",
        itemLabel: "Contact",
        fields: [
          {
            type: "string",
            name: "name",
            label: "Name",
            default: "John Doe",
          } as FieldConfig,
          {
            type: "boolean",
            name: "active",
            label: "Active",
            default: true,
          } as FieldConfig,
        ],
      },
    ];

    renderWithProviders(<DynamicForm fields={fields} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        contacts: [{ name: "John Doe", active: true }],
      })
    );
  });

  it("shows an array-level error when required array has no items", () => {
    const onSubmit = vi.fn();

    const fields: FieldConfig[] = [
      {
        type: "array",
        name: "contacts",
        label: "Contacts",
        itemLabel: "Contact",
        required: true,
        fields: [
          {
            type: "string",
            name: "name",
            label: "Name",
          },
        ],
      },
    ];

    renderWithProviders(<DynamicForm fields={fields} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Please fix the errors below before submitting.")).toBeInTheDocument();
    expect(screen.getByText("At least one item is required.")).toBeInTheDocument();
  });

  it("supports nested arrays inside groups and arrays", () => {
    const onSubmit = vi.fn();

    const fields: FieldConfig[] = [
      {
        type: "group",
        name: "company",
        label: "Company Info",
        fields: [
          {
            type: "array",
            name: "departments",
            label: "Departments",
            itemLabel: "Department",
            fields: [
              {
                type: "string",
                name: "name",
                label: "Department Name",
                required: true,
              },
              {
                type: "array",
                name: "employees",
                label: "Employees",
                itemLabel: "Employee",
                fields: [
                  {
                    type: "string",
                    name: "firstName",
                    label: "First Name",
                    required: true,
                  },
                  {
                    type: "array",
                    name: "contacts",
                    label: "Contacts",
                    itemLabel: "Contact",
                    fields: [
                      {
                        type: "string",
                        name: "value",
                        label: "Contact Value",
                        required: true,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    renderWithProviders(<DynamicForm fields={fields} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /add department/i }));
    fireEvent.change(screen.getByLabelText(/department name/i), {
      target: { value: "Engineering" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add employee/i }));
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Alice" } });

    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));
    fireEvent.change(screen.getByLabelText(/contact value/i), {
      target: { value: "alice@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        departments: [
          {
            name: "Engineering",
            employees: [
              {
                firstName: "Alice",
                contacts: [{ value: "alice@example.com" }],
              },
            ],
          },
        ],
      })
    );
  });

  it("reorders deeply nested contacts independently", () => {
    const onSubmit = vi.fn();

    const fields: FieldConfig[] = [
      {
        type: "group",
        name: "company",
        fields: [
          {
            type: "array",
            name: "departments",
            itemLabel: "Department",
            fields: [
              {
                type: "string",
                name: "name",
                label: "Department Name",
                required: true,
              },
              {
                type: "array",
                name: "employees",
                itemLabel: "Employee",
                fields: [
                  {
                    type: "string",
                    name: "firstName",
                    label: "First Name",
                    required: true,
                  },
                  {
                    type: "array",
                    name: "contacts",
                    itemLabel: "Contact",
                    fields: [
                      {
                        type: "string",
                        name: "value",
                        label: "Contact Value",
                        required: true,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    renderWithProviders(<DynamicForm fields={fields} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /add department/i }));
    fireEvent.change(screen.getByLabelText(/department name/i), {
      target: { value: "Engineering" },
    });

    fireEvent.click(screen.getByRole("button", { name: /add employee/i }));
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Alice" } });

    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));
    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));

    const contactInputs = screen.getAllByLabelText(/contact value/i);
    fireEvent.change(contactInputs[0], { target: { value: "alice@example.com" } });
    fireEvent.change(contactInputs[1], { target: { value: "+1-555-0101" } });

    fireEvent.click(screen.getByRole("button", { name: /move contact 1 down/i }));
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        departments: [
          expect.objectContaining({
            employees: [
              expect.objectContaining({
                contacts: [{ value: "+1-555-0101" }, { value: "alice@example.com" }],
              }),
            ],
          }),
        ],
      })
    );
  });

  it("pre-validates initial values on mount when validateOnMount is enabled", async () => {
    const onSubmit = vi.fn();

    const fields: FieldConfig[] = [
      {
        type: "string",
        name: "name",
        label: "Name",
        required: true,
      },
    ];

    renderWithProviders(
      <DynamicForm fields={fields} initialValues={{}} onSubmit={onSubmit} validateOnMount />
    );

    expect(await screen.findByText("This field is required.")).toBeInTheDocument();
    expect(
      await screen.findByText("Please fix the errors below before submitting.")
    ).toBeInTheDocument();
  });
});
