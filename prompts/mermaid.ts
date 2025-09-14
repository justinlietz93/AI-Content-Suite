export const GENERATE_MERMAID_FROM_DIGEST_PROMPT = (digest: string) => `
You are a Mermaid.js expert. Based on the following entity-relationship digest, create a comprehensive Mermaid.js graph diagram (\`graph TD\`).

**Instructions:**
1.  Analyze all the entities and their relationships in the provided text.
2.  Create a single \`graph TD\` that visualizes all these connections.
3.  De-duplicate relationships.
4.  The final output MUST be ONLY the Mermaid code inside a Markdown code fence (\`\`\`mermaid ... \`\`\`).
5.  Do not add any explanations, titles, or any other text before or after the code fence.
6.  **CRITICAL SYNTAX FOR LINKS:** To add a label to a link, you MUST use the format: \`NodeA -- Link Label --> NodeB\`. Do NOT use quotes around the link label.
    *   **Correct:** \`User -- writes --> Document\`
    *   **Incorrect:** \`User -- "writes" --> Document\`

**Entity-Relationship Digest:**
---
${digest}
---

**Mermaid Diagram:**
`;

export const GENERATE_SIMPLIFIED_MERMAID_PROMPT = (digest: string, rules: string) => `
You are a Mermaid.js expert specializing in data visualization for documentation.
Based on the following detailed entity-relationship digest, create a **simplified**, high-level Mermaid.js graph diagram (\`graph TD\`).

**Your Goal:** Create a diagram that is easy to read and understand at a glance inside a static Markdown document. It must be visually clean and avoid being too cluttered.

**Instructions:**
1.  **Analyze the full digest:** Understand all entities and their relationships.
2.  **Simplify:**
    *   Focus on the **most important entities** and their primary relationships.
    *   You MAY omit less important entities or group related minor entities into a single representative node.
    *   You SHOULD omit most or all attributes to reduce clutter.
    *   The goal is to show the high-level structure, not every single detail.
3.  **Create a \`graph TD\` diagram:** The final output MUST be ONLY the Mermaid code inside a Markdown code fence (\`\`\`mermaid ... \`\`\`).
4.  **Do not add any explanations or other text** before or after the code fence.
5.  **Adhere to Mermaid.js syntax rules:** Use the provided syntax documentation to ensure the diagram is valid. Pay close attention to link labeling.

**CRITICAL SYNTAX FOR LINKS:** To add a label to a link, you MUST use the format: \`NodeA -- Link Label --> NodeB\`. Do NOT use quotes around the link label.
    *   **Correct:** \`User -- writes --> Document\`
    *   **Incorrect:** \`User -- "writes" --> Document\`

---
**DETAILED ENTITY-RELATIONSHIP DIGEST:**
${digest}
---

---
**MERMAID SYNTAX RULES REFERENCE:**
${rules}
---

**Simplified Mermaid Diagram:**
`;


// A clear, concise, and correct set of rules for the AI to follow for Mermaid syntax.
// This replaces the previous verbose and confusing documentation.
export const MERMAID_RULES_DOCS = `
# Mermaid.js \`graph TD\` Syntax Rules

## 1. Basic Structure
- Start with \`graph TD;\` or \`graph TD\`.
- \`TD\` means Top to Down.

## 2. Nodes
- A node is defined by an ID and optional text.
- Example: \`nodeId[Node Text]\` defines a node with ID \`nodeId\` and label "Node Text".
- If no text is provided, the ID is used as the label: \`nodeId\`.
- Node IDs should not contain spaces or special characters. Use alphanumeric characters and underscores.

## 3. CRITICAL: Links and Link Labels
- A link connects two nodes.
- To add a label (text) to a link, you **MUST** use this exact format: \`nodeA -- Link Text --> nodeB\`
- The text goes between two dashes \`--\` on each side.
- **DO NOT** use quotes around the link label.
- **DO NOT** use the pipe character like \`-->|text|\`. Use the double-dash format.

### Correct Syntax Example:
\`\`\`
graph TD
    User[User] -- submits form --> WebServer[Web Server];
    WebServer -- queries data from --> Database[Database];
    Database -- returns results to --> WebServer;
    WebServer -- displays page to --> User;
\`\`\`

### Incorrect Syntax Examples (DO NOT USE):
- \`User -- "submits form" --> WebServer\` (Incorrect: uses quotes)
- \`User -->|submits form| WebServer\` (Incorrect: uses pipes)
`;