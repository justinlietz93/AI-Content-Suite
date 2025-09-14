import type { RequestSplitterSettings } from '../types';

export const REQUEST_SPLITTER_PLANNING_PROMPT_TEMPLATE = (spec: string, settings: RequestSplitterSettings) => `
You are an expert system architect AI. Your first task is to create a high-level plan for decomposing a large request.
Analyze the user's specification and determine the sequence of implementation prompts needed.

**PROCESS:**
1.  **Analyze Spec:** Thoroughly understand the user's entire specification.
2.  **Identify Invariants:** Extract global rules, constraints, and architectural principles that must apply to every step.
3.  **Define Sequential Plan:** Create a list of titles for each implementation prompt, starting with a foundational step and building upon it. The plan should have at least 2 steps and not more than 15.
4.  **Output JSON:** Format the entire output as a single, valid JSON object. Do not include any other text.

**CRITICAL JSON FORMATTING RULE:** You must produce a single, valid, parsable JSON object. All string values must be correctly escaped, especially newlines (\\n) and double quotes (\\").

**OUTPUT SCHEMA (A single JSON object):**
\`\`\`json
{
  "project": {
    "name": "...",
    "architecture": "...",
    "invariants": ["..."]
  },
  "plan": [
    { "id": 1, "title": "Foundation: Core Data Models and Services" },
    { "id": 2, "title": "Feature: Add User Authentication Endpoint" }
  ]
}
\`\`\`

---
**USER'S SPECIFICATION DOCUMENT:**
${spec}
---
Begin planning. Output only the single, valid JSON object containing the project context and the plan with titles.
`;


export const REQUEST_SPLITTER_GENERATION_PROMPT_TEMPLATE = (
    projectContext: { name: string; architecture: string; invariants: string[] },
    currentPromptTitle: string,
    completedPromptTitles: string[]
) => `
You are an expert system architect AI. Your task is to generate the full content for a single, self-contained implementation prompt.
This prompt is part of a larger, sequential build plan. It must contain all necessary context for an agent to execute it, assuming the work from previous steps is complete.

**CRITICAL INSTRUCTION:** Generate only the text content for the prompt described below. You must fill in the content for the placeholders like <...>. Do not wrap the final output in JSON or Markdown fences.

**TEMPLATE TO USE FOR THE GENERATED PROMPT'S CONTENT:**
(You must fill this template out completely. Every part is mandatory.)
---
[#${completedPromptTitles.length + 1}] ${currentPromptTitle}

**PROJECT CONTEXT**
- **Application:** ${projectContext.name}
- **Architecture:** ${projectContext.architecture}
- **Invariants:**
${projectContext.invariants.map(inv => `  - ${inv}`).join('\n')}

**PREREQUISITES**
- This step assumes the successful completion of the following previous steps:
${completedPromptTitles.length > 0 ? completedPromptTitles.map((title, i) => `  - [#${i + 1}] ${title}`).join('\n') : '  - None. This is the first step.'}

**FEATURE REQUEST**
- **Modify the existing codebase** to implement exactly one new feature: **${currentPromptTitle}**.
- This step builds upon the code generated in the prerequisite steps.

**DETAILS**
- **Input:** <Describe data/signals for this specific feature>
- **Output:** <Describe files/artifacts/sections to be created or modified>
- **Constraints:** <Describe limits, non-functional requirements etc.>
- **Non-goals:** <Describe excluded scope for this step>

**ACCEPTANCE CRITERIA**
- [ ] Feature is implemented and integrated correctly.
- [ ] Conforms to all project INVARIANTS.
- [ ] Unit tests for the new feature are included.

**AGENT INSTRUCTIONS**
- **Assume no prior context or memory about previous prompts.**
- Use the PROJECT CONTEXT, Invariants, and this FEATURE REQUEST only to guide your work.
- Do not reference other prompts by number except in the prerequisites section.
---

Begin generation. Output only the raw text for this single prompt.
`;
