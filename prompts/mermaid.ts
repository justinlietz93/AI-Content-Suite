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

export const GENERATE_SIMPLIFIED_MERMAID_PROMPT = (digest: string) => `
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
5.  **Adhere to Mermaid.js syntax rules:** Pay close attention to link labeling.

**CRITICAL SYNTAX FOR LINKS:** To add a label to a link, you MUST use the format: \`NodeA -- Link Label --> NodeB\`. Do NOT use quotes around the link label.
    *   **Correct:** \`User -- writes --> Document\`
    *   **Incorrect:** \`User -- "writes" --> Document\`

---
**DETAILED ENTITY-RELATIONSHIP DIGEST:**
${digest}
---

**Simplified Mermaid Diagram:**
`;


export const CORRECT_MERMAID_SYNTAX_PROMPT = (invalidCode: string, errorMessage: string, relevantDocs: string) => `
You are a Mermaid.js syntax correction expert.
You previously generated a Mermaid diagram, but it contained a syntax error.
Your task is to fix the error and provide the corrected code.

**Original (Incorrect) Code:**
\`\`\`mermaid
${invalidCode}
\`\`\`

**Error Message from Validator:**
\`\`\`
${errorMessage}
\`\`\`

**Relevant Documentation / Rules:**
---
${relevantDocs}
---

**Instructions:**
1. Analyze the error message and the incorrect code.
2. Use the provided documentation to understand the correct syntax.
3. Rewrite the Mermaid code to fix the error.
4. The final output MUST be ONLY the corrected Mermaid code inside a Markdown code fence (\`\`\`mermaid ... \`\`\`).
5. Do not add any explanations, apologies, or any other text before or after the code fence.

**Corrected Mermaid Diagram:**
`;
