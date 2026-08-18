export type VisualFieldType = "text" | "number" | "date" | "boolean";

export interface VisualField {
  name: string;
  type: VisualFieldType;
  required: boolean;
}

export interface VisualSection {
  name: string;
  label: string;
  repeating: boolean;
  fields: VisualField[];
}

export interface VisualSchemaDescription {
  supported: boolean;
  sections: VisualSection[];
  errors: string[];
}

export type VisualSchemaAction =
  | { type: "addSection" }
  | { type: "renameSection"; section: string; name: string }
  | { type: "setSectionRepeating"; section: string; repeating: boolean }
  | { type: "deleteSection"; section: string }
  | { type: "addField"; section: string }
  | { type: "renameField"; section: string; field: string; name: string }
  | { type: "setFieldType"; section: string; field: string; value: VisualFieldType }
  | { type: "setFieldRequired"; section: string; field: string; required: boolean }
  | { type: "deleteField"; section: string; field: string };

export function describeVisualSchema(schema: unknown): VisualSchemaDescription {
  const root = asRecord(schema);
  const properties = asRecord(root?.properties);
  if (!root || root.type !== "object" || !properties) {
    return {
      supported: false,
      sections: [],
      errors: ["Visual Builder supports schemas with a top-level object and named sections."],
    };
  }

  const sections: VisualSection[] = [];
  const errors: string[] = [];
  for (const [name, value] of Object.entries(properties)) {
    const sectionNode = asRecord(value);
    const repeating = sectionNode?.type === "array";
    const objectNode = repeating ? asRecord(sectionNode?.items) : sectionNode;
    const fieldProperties = asRecord(objectNode?.properties);
    if (!objectNode || objectNode.type !== "object" || !fieldProperties) {
      errors.push(`Section “${name}” must be an object or an array of objects.`);
      continue;
    }

    const required = new Set(asStringArray(objectNode.required));
    const fields: VisualField[] = [];
    for (const [fieldName, fieldValue] of Object.entries(fieldProperties)) {
      const fieldNode = asRecord(fieldValue);
      const type = fieldTypeFromNode(fieldNode);
      if (!type) {
        errors.push(`Field “${name}.${fieldName}” uses a type Visual Builder cannot edit safely.`);
        continue;
      }
      fields.push({ name: fieldName, type, required: required.has(fieldName) });
    }
    sections.push({ name, label: sectionLabel(name), repeating, fields });
  }

  return { supported: errors.length === 0, sections, errors };
}

export function updateVisualSchema(schema: unknown, action: VisualSchemaAction): unknown {
  const root = cloneRecord(schema);
  const properties = asRecord(root.properties);
  if (!properties) return schema;

  if (action.type === "addSection") {
    const name = uniqueName(properties, "new_section");
    properties[name] = createSectionNode(false);
    root.properties = properties;
    return root;
  }

  if (action.type === "deleteSection") {
    delete properties[action.section];
    removeRequired(root, action.section);
    root.properties = properties;
    return root;
  }

  if (action.type === "renameSection") {
    const name = normalizeName(action.name, action.section);
    if (name !== action.section && properties[name] === undefined) {
      properties[name] = properties[action.section];
      delete properties[action.section];
      renameRequired(root, action.section, name);
    }
    root.properties = properties;
    return root;
  }

  const sectionNode = asRecord(properties[action.section]);
  if (!sectionNode) return schema;
  const repeating = sectionNode.type === "array";
  const objectNode = repeating ? asRecord(sectionNode.items) : sectionNode;
  const fieldProperties = asRecord(objectNode?.properties);
  if (!objectNode || !fieldProperties) return schema;

  if (action.type === "setSectionRepeating") {
    if (action.repeating && !repeating) {
      properties[action.section] = { type: "array", items: sectionNode };
    } else if (!action.repeating && repeating) {
      properties[action.section] = sectionNode.items;
    }
    root.properties = properties;
    return root;
  }

  if (action.type === "addField") {
    const name = uniqueName(fieldProperties, "new_field");
    fieldProperties[name] = { type: ["string", "null"] };
    objectNode.properties = fieldProperties;
    root.properties = properties;
    return root;
  }

  if (action.type === "deleteField") {
    delete fieldProperties[action.field];
    removeRequired(objectNode, action.field);
    objectNode.properties = fieldProperties;
    root.properties = properties;
    return root;
  }

  if (action.type === "renameField") {
    const name = normalizeName(action.name, action.field);
    if (name !== action.field && fieldProperties[name] === undefined) {
      fieldProperties[name] = fieldProperties[action.field];
      delete fieldProperties[action.field];
      renameRequired(objectNode, action.field, name);
    }
    objectNode.properties = fieldProperties;
    root.properties = properties;
    return root;
  }

  const fieldNode = asRecord(fieldProperties[action.field]);
  if (!fieldNode) return schema;
  if (action.type === "setFieldType") {
    fieldProperties[action.field] = withFieldType(fieldNode, action.value);
  } else if (action.type === "setFieldRequired") {
    if (action.required) addRequired(objectNode, action.field);
    else removeRequired(objectNode, action.field);
  }
  objectNode.properties = fieldProperties;
  root.properties = properties;
  return root;
}

export function sectionLabel(name: string): string {
  const known: Record<string, string> = {
    doc_info: "Document info",
    row_data: "Line items",
    footer: "Footer",
  };
  if (known[name]) return known[name];
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Untitled section";
}

function fieldTypeFromNode(node: Record<string, unknown> | undefined): VisualFieldType | null {
  if (!node) return null;
  const types = Array.isArray(node.type) ? node.type.filter((type): type is string => typeof type === "string" && type !== "null") : [node.type];
  if (types.length !== 1) return null;
  if (types[0] === "string") return node.format === "date" ? "date" : node.format === undefined ? "text" : null;
  if (types[0] === "number" || types[0] === "integer") return "number";
  if (types[0] === "boolean") return "boolean";
  return null;
}

function withFieldType(node: Record<string, unknown>, type: VisualFieldType): Record<string, unknown> {
  const next = { ...node };
  const nullable = Array.isArray(node.type) && node.type.includes("null");
  const jsonType = type === "text" || type === "date" ? "string" : type === "number" ? "number" : "boolean";
  next.type = nullable ? [jsonType, "null"] : jsonType;
  if (type === "date") next.format = "date";
  else if (next.format === "date") delete next.format;
  return next;
}

function createSectionNode(repeating: boolean): Record<string, unknown> {
  const objectNode = { type: "object", properties: {}, required: [], additionalProperties: false };
  return repeating ? { type: "array", items: objectNode } : objectNode;
}

function cloneRecord(schema: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function uniqueName(properties: Record<string, unknown>, base: string): string {
  if (properties[base] === undefined) return base;
  let index = 2;
  while (properties[`${base}_${index}`] !== undefined) index += 1;
  return `${base}_${index}`;
}

function normalizeName(value: string, fallback: string): string {
  const name = value.trim().replace(/\s+/g, "_");
  return name || fallback;
}

function addRequired(node: Record<string, unknown>, field: string): void {
  const required = asStringArray(node.required);
  if (!required.includes(field)) node.required = [...required, field];
}

function removeRequired(node: Record<string, unknown>, field: string): void {
  const required = asStringArray(node.required).filter((item) => item !== field);
  if (required.length > 0) node.required = required;
  else delete node.required;
}

function renameRequired(node: Record<string, unknown>, oldName: string, newName: string): void {
  const required = asStringArray(node.required);
  if (required.includes(oldName)) node.required = required.map((item) => (item === oldName ? newName : item));
}
