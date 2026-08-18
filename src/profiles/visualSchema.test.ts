import { describe, expect, it } from "vitest";
import { describeVisualSchema, updateVisualSchema } from "./visualSchema";

const schema = {
  type: "object",
  properties: {
    doc_info: {
      type: "object",
      properties: {
        document_number: { type: ["string", "null"] },
        date: { type: ["string", "null"], format: "date" },
      },
      required: ["document_number", "date"],
    },
    row_data: {
      type: "array",
      items: {
        type: "object",
        properties: { qty: { type: ["number", "null"] } },
        required: ["qty"],
      },
    },
  },
};

describe("visual schema builder", () => {
  it("describes human-friendly sections, types, required status, and repeating rows", () => {
    const result = describeVisualSchema(schema);

    expect(result.supported).toBe(true);
    expect(result.sections).toEqual([
      {
        name: "doc_info",
        label: "Document info",
        repeating: false,
        fields: [
          { name: "document_number", type: "text", required: true },
          { name: "date", type: "date", required: true },
        ],
      },
      {
        name: "row_data",
        label: "Line items",
        repeating: true,
        fields: [{ name: "qty", type: "number", required: true }],
      },
    ]);
  });

  it("updates a field without dropping the rest of the schema", () => {
    const optional = updateVisualSchema(schema, {
      type: "setFieldRequired",
      section: "doc_info",
      field: "date",
      required: false,
    }) as typeof schema;
    const renamed = updateVisualSchema(optional, {
      type: "renameField",
      section: "doc_info",
      field: "date",
      name: "order_date",
    }) as typeof schema;
    const typed = updateVisualSchema(renamed, {
      type: "setFieldType",
      section: "doc_info",
      field: "order_date",
      value: "text",
    }) as typeof schema;

    expect(typed.properties.doc_info.properties).toHaveProperty("document_number");
    expect(typed.properties.doc_info.properties).toHaveProperty("order_date");
    expect(typed.properties.doc_info.properties).not.toHaveProperty("date");
    expect(typed.properties.doc_info.required).toEqual(["document_number"]);
    expect(typed.properties.row_data.type).toBe("array");
  });

  it("adds and deletes fields and sections", () => {
    const withField = updateVisualSchema(schema, { type: "addField", section: "row_data" }) as typeof schema;
    expect(withField.properties.row_data.items.properties).toHaveProperty("new_field");

    const withoutField = updateVisualSchema(withField, {
      type: "deleteField",
      section: "row_data",
      field: "new_field",
    }) as typeof schema;
    expect(withoutField.properties.row_data.items.properties).not.toHaveProperty("new_field");

    const withSection = updateVisualSchema(withoutField, { type: "addSection" }) as typeof schema;
    expect(withSection.properties).toHaveProperty("new_section");
    const withoutSection = updateVisualSchema(withSection, { type: "deleteSection", section: "new_section" }) as typeof schema;
    expect(withoutSection.properties).not.toHaveProperty("new_section");
  });

  it("fails clearly for structures it cannot represent", () => {
    const result = describeVisualSchema({ type: "object", properties: { nested: { type: "object" } } });
    expect(result.supported).toBe(false);
    expect(result.errors[0]).toMatch(/must be an object or an array/i);
  });
});
