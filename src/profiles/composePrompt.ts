/**
 * Builds the final provider prompt from the modular profile parts
 * (docs/PROMPT_CONTRACT.md): Stable Base Rules + Extraction Contract +
 * Output JSON Schema, plus the mandatory field-isolation semantics.
 */
export function composePrompt(basePrompt: string, extractionContract: unknown, jsonSchema: unknown): string {
  const contractJson = JSON.stringify(extractionContract, null, 2);
  const schemaJson = JSON.stringify(jsonSchema, null, 2);
  return [
    basePrompt.trim(),
    "",
    "EXTRACTION CONTRACT (requested fields only):",
    "```json",
    contractJson,
    "```",
    "",
    "OUTPUT JSON SCHEMA:",
    "```json",
    schemaJson,
    "```",
    "",
    "Rules:",
    "- Respond with a single JSON object matching the output schema.",
    "- Determine which source column each visible value belongs to before mapping; ignore values of unrequested columns, never move them into requested fields.",
    "- Missing printed values are null (null is not zero and not an empty string).",
    "- Use printed values only; do not calculate totals unless the profile explicitly requests calculation.",
    "",
  ].join("\n");
}
