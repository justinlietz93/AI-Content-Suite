
import type { AgentDesignerSettings } from '../types';

export const AGENT_DESIGNER_PROMPT_TEMPLATE = (settings: AgentDesignerSettings) => {
  const isSingleAgent = settings.systemType === 'singleAgent';
  
  const persona = isSingleAgent 
    ? "You are an expert AI Architect and Fine-Tuning Specialist. Your task is to design a robust, high-performing single agent system, including plans for fine-tuning and data curation."
    : "You are an expert multi-agent systems architect. Your task is to design a robust and scalable agentic system based on a user's high-level goal and provided configuration.";

  const designPrinciples = isSingleAgent
    ? `
**DESIGN PRINCIPLES TO FOLLOW:**
1.  **Clarity of Purpose:** The agent's prompt must define a clear role, capabilities, and constraints.
2.  **Tooling:** Define specific, atomic tools the agent can use to accomplish its goal.
3.  **Fine-Tuning Strategy:** The fine-tuning plan must be actionable and tailored to the agent's goal.
4.  **Data Curation:** The data plan must be practical and lead to a high-quality dataset.`
    : `
**DESIGN PRINCIPLES TO FOLLOW:**
1.  **Modularity:** Decompose the system into distinct agents with clear responsibilities (e.g., a Router Agent, a Research Agent, a Writing Agent).
2.  **Tooling:** Define specific, atomic tools that agents can use (e.g., \`web_search\`, \`read_file\`, \`send_email\`).
3.  **State Management:** Consider how the state of a task is maintained and passed between agents.
4.  **Control Flow:** Design a clear control flow, often orchestrated by a primary agent or router.
5.  **Error Handling:** Include concepts for handling failed tasks or tool executions.`;

  const pipeline = isSingleAgent
    ? `
**PIPELINE TO SIMULATE:**
1.  **Analyze Goal:** Deconstruct the user's goal: "${settings.goal}".
2.  **Define Core Agent:** Design the primary agent's prompt template and necessary tools based on user-selected capabilities.
3.  **Create Fine-Tuning Plan:** Detail the strategy for fine-tuning the base model to specialize it for the task. Include data requirements, size, and evaluation methods.
4.  **Create Data Curation Plan:** Describe how to source, clean, and format the data required for the fine-tuning dataset.
5.  **Map Process Flow:** Create a simple Mermaid diagram illustrating the agent's primary action loop (e.g., receive trigger, use tools, produce output).
6.  **Synthesize Artifacts:**
    *   **designMarkdown:** Write a comprehensive overview of the agent, its tools, and the detailed fine-tuning and data curation plans.
    *   **designPlanJson:** Populate the detailed JSON structure, including the new plan objects.
    *   **designFlowDiagram:** Create the Mermaid.js \`graph TD\` that visually represents the agent's process.`
    : `
**PIPELINE TO SIMULATE:**
1.  **Analyze Goal:** Deconstruct the user's goal: "${settings.goal}".
2.  **Select Architecture:** Choose a suitable architecture (e.g., Router-Worker, Hierarchical, Broadcast) based on the goal.
3.  **Define Agents & Tools:**
    *   Define the necessary agents and their specific roles/prompts.
    *   Define the tools required to accomplish the goal, especially considering the user-selected capabilities: Web Search (${settings.capabilities.webSearch}), Email (${settings.capabilities.emailAccess}), File I/O (${settings.capabilities.fileIO}), Code Execution (${settings.capabilities.codeExecution}).
4.  **Map Process Flow:** Chart the sequence of operations, agent interactions, and tool usage from trigger to completion.
5.  **Synthesize Artifacts:**
    *   **designMarkdown:** Write a comprehensive overview of the system design, explaining the architecture, agents, tools, and process flow in a readable format.
    *   **designPlanJson:** Populate the detailed JSON structure according to the schema below.
    *   **designFlowDiagram:** Create a Mermaid.js \`graph TD\` that visually represents the process flow.`;

  const jsonSchema = isSingleAgent
    ? `
**\`designPlanJson\` SCHEMA:**
\`\`\`json
{
  "systemName": "...",
  "goal": "...",
  "trigger": { "type": "${settings.trigger}", "details": "..." },
  "architecture": "Single Agent",
  "agents": [
    { "name": "...", "role": "...", "promptTemplate": "...", "tools": ["..."] }
  ],
  "tools": [
    { "name": "...", "description": "...", "inputSchema": {}, "outputSchema": {} }
  ],
  "dataFlow": "...",
  "fineTuningPlan": {
    "strategy": "...",
    "baseModel": "...",
    "datasetSize": "...",
    "evaluationMetrics": ["..."]
  },
  "dataCurationPlan": {
    "sources": ["..."],
    "cleaningSteps": ["..."],
    "formatting": "..."
  }
}
\`\`\``
    : `
**\`designPlanJson\` SCHEMA:**
\`\`\`json
{
  "systemName": "...",
  "goal": "...",
  "trigger": {
    "type": "${settings.trigger}",
    "details": "..."
  },
  "architecture": "...",
  "agents": [
    { "name": "...", "role": "...", "promptTemplate": "...", "tools": ["..."] }
  ],
  "tools": [
    { "name": "...", "description": "...", "inputSchema": {}, "outputSchema": {} }
  ],
  "dataFlow": "..."
}
\`\`\``;

  return `
${persona}
You must generate a comprehensive design document consisting of a Markdown overview, a Mermaid.js process flow diagram, and a structured JSON plan.

**CRITICAL JSON FORMATTING RULE:** Your entire output must be a single, valid, parsable JSON object. The string values within the JSON, especially for the \`designMarkdown\` and \`designFlowDiagram\` keys, must be meticulously escaped.
- Every double quote character (") within a string value MUST be escaped as \\".
- Every backslash character (\\) within a string value MUST be escaped as \\\\.
- Every newline character must be represented as \\n.
Failure to produce a perfectly valid JSON will render the entire output useless. Double-check your escaping.

**OUTPUT REQUIREMENTS:**
Your final output MUST be a single, valid, parsable JSON object with the following structure. Do not include any text, explanations, or code fences before or after the JSON object.
\`\`\`json
{
  "designMarkdown": "...",
  "designPlanJson": { ... },
  "designFlowDiagram": "..."
}
\`\`\`

${designPrinciples}

${pipeline}

${jsonSchema}

---
**USER CONFIGURATION:**
- **Goal:** ${settings.goal}
- **System Type:** ${settings.systemType}
- **Provider:** ${settings.provider}
- **Trigger:** ${settings.trigger}
- **Capabilities:** ${JSON.stringify(settings.capabilities)}
---
Begin generation. Output only the single, valid JSON object containing the design artifacts.
`;
};
