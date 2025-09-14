
import type { ProgressUpdate, RewriteLength } from './types';

export const GEMINI_FLASH_MODEL = 'gemini-2.5-flash';

// Approximate token estimation: 1 token ~ 4 characters.
// Target chunk size for LLM processing. Drastically increased to maximize model's context window.
// Aiming for ~112.5k tokens (450k chars) within the 128k token limit of gemini-2.5-flash.
export const TARGET_CHUNK_CHAR_SIZE = 450000; 
// Overlap characters to maintain context between chunks, adjusted for new chunk size (10%).
export const CHUNK_OVERLAP_CHAR_SIZE = 45000; 

export const MAX_REDUCTION_INPUT_SUMMARIES = 5; // Number of summaries/analyses to combine in one reduction step

// Low concurrency as individual chunk processing calls will be very large and take significant time.
export const CONCURRENT_CHUNK_REQUEST_LIMIT = 2; 

// New constants for hierarchical "power" mode
export const HIERARCHICAL_CONCURRENT_CHUNK_REQUEST_LIMIT = 5; // Reduced from 10 to avoid rate limiting
export const HIERARCHICAL_CHUNK_GROUP_SIZE = 3;

export const INITIAL_PROGRESS: ProgressUpdate = {
  stage: 'Idle',
  percentage: 0,
  message: 'Waiting for file selection.'
};

const CITATION_INSTRUCTION = `\n\nIf any external links, references, or citations are included, they MUST be listed at the end of the entire response in a dedicated "References" section, formatted using a professional citation style (e.g., APA, MLA). Do not invent citations. Only list them if present in the source text.`;


// --- Default Summary Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_DEFAULT = (text: string) => `
You are an expert technical analyst. Your task is to provide a comprehensive, detailed summary of the following segment of a technical document or transcript.
Focus on extracting the key concepts, technical details, decisions made, and any action items mentioned.
Do not make up information. The summary should be dense with information but still highly readable.
Organize the summary logically, using paragraphs to separate different topics.
The output should be a clean summary, without any introductory or concluding remarks like "Here is the summary".

Here is the document segment:
---
${text}
---

Provide your comprehensive summary below:
${CITATION_INSTRUCTION}
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_DEFAULT = (text: string) => `
You are an expert editor and synthesizer of information.
You will be given a series of summaries from consecutive segments of a larger document.
Your task is to synthesize these summaries into a single, cohesive, and comprehensive summary that flows naturally.
Eliminate redundancy, resolve contradictions, and connect related concepts across the different segments.
The final output should be a polished, detailed summary of the combined information. Do not lose any key details from the input summaries.
The output should be a clean summary, without any introductory or concluding remarks.

Here are the summaries to synthesize:
---
${text}
---

Provide the single, synthesized summary below:
${CITATION_INSTRUCTION}
`;


// --- Session Handoff Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_SESSION_HANDOFF = (text: string) => `
You are a technical analyst AI creating a "session handoff" document. Your task is to process a segment of a larger document and extract structured information that another AI can easily parse and understand.

Analyze the following document segment and extract the information into the following Markdown structure. If a section is not relevant, state "Not mentioned in this segment."

**### Core Objective & Key Topics ###**
- (A bulleted list of the main goals or subjects discussed in this segment.)

**### Key Entities & Terminology ###**
- **People:** (List names and roles, if mentioned)
- **Projects/Components:** (List any specific projects, software, or components)
- **Technical Terms:** (Define any jargon or key technical concepts introduced)

**### Sequence of Events & Decisions ###**
- (A chronological or logical summary of discussions, actions taken, or decisions made in this segment.)

**### Key Data & Metrics ###**
- (List any specific numbers, statistics, or performance metrics mentioned.)

**### Open Questions & Action Items ###**
- (List any unresolved issues, questions asked, or tasks assigned to someone.)

**### Technical Context & Assumptions ###**
- (Describe any underlying technical details, constraints, or assumptions that are important for understanding this segment.)

---
DOCUMENT SEGMENT:
${text}
---

Provide the structured handoff information for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_SESSION_HANDOFF = (text: string) => `
You are an expert editor AI responsible for creating a final "session handoff" document.
You will be given a series of structured summaries from consecutive segments of a larger document.
Your task is to merge these individual summaries into a single, cohesive, and comprehensive handoff document.

Follow these instructions:
1.  Use the same Markdown structure as the input summaries (Core Objective, Key Entities, etc.).
2.  Combine and de-duplicate information from all segments under the appropriate headings.
3.  Synthesize the "Sequence of Events & Decisions" into a single, flowing narrative.
4.  Consolidate all "Key Data," "Action Items," etc., into master lists.
5.  The final output should be a polished, well-organized document that represents the entirety of the input summaries. Do not lose critical details.

---
STRUCTURED SUMMARIES TO SYNTHESIZE:
${text}
---

Provide the single, synthesized session handoff document below.
`;

// --- README.md Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_README = (text: string) => `
You are a technical writer AI tasked with creating a section of a project README.md file.
Your job is to analyze the following document segment and extract information relevant to a project's documentation.
Format the output in Markdown. Infer a suitable project name if one is not explicitly mentioned.

If a section is not relevant or information is not present in the segment, omit the section entirely.

# [Inferred Project Name]

## Overview
(Provide a brief, one-paragraph summary of the project's purpose or the main topic discussed in this segment.)

## Key Features / Concepts
- (A bulleted list of the most important features, technologies, or concepts discussed.)

## Technical Details
- (A bulleted list of specific technical implementation details, architectural decisions, or algorithms mentioned.)

## Setup & Usage
(If any setup instructions, code snippets, or usage examples are present, include them here in a formatted code block. Otherwise, omit this section.)

## Decisions & Action Items
- (A bulleted list of any decisions made or tasks assigned.)

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the README.md section based on the document segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_README = (text: string) => `
You are an expert technical editor AI responsible for creating a final, comprehensive README.md document.
You will be given a series of README sections generated from consecutive parts of a larger document.
Your task is to intelligently merge these sections into a single, cohesive, well-structured README.md file.

Follow these instructions:
1.  Synthesize a single, definitive project name and use it for the main \`# Title\`.
2.  Combine all "Overview" sections into a single, polished introductory paragraph.
3.  Merge all "Key Features / Concepts," "Technical Details," and "Decisions & Action Items" into master bulleted lists, removing any duplicate points.
4.  Consolidate any "Setup & Usage" sections. If there are multiple, try to order them logically.
5.  The final output should be a clean, well-organized, and comprehensive README.md file. Ensure consistent formatting. Do not lose any critical information.

---
README SECTIONS TO SYNTHESIZE:
${text}
---

Provide the single, synthesized README.md document below.
`;


// --- Solution Finder Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_SOLUTION_FINDER = (text: string) => `
You are an expert technical support engineer. Your task is to analyze the following document segment to find a solution to a problem.
Your goal is to create a clear, step-by-step instructional guide based ONLY on the information provided in the segment.

Follow these instructions carefully:
1.  Identify a problem, error, or question being addressed in the text.
2.  Extract the corresponding solution as a series of actionable steps.
3.  If any terminal commands, code snippets, or configuration changes are part of the solution, they MUST be included in Markdown code fences (\`\`\`) to be easily copyable.
4.  Format the output as a numbered list in Markdown.
5.  If no clear problem and solution are present in this segment, state "No specific solution was identified in this segment."

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the step-by-step solution guide based on the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_SOLUTION_FINDER = (text: string) => `
You are a senior technical writer responsible for creating a final, comprehensive solution guide.
You have been given a series of step-by-step instructions extracted from different segments of a larger document.
Your task is to synthesize these segments into a single, cohesive, start-to-finish guide.

Follow these instructions:
1.  Analyze all the provided steps and understand the overall solution flow.
2.  Merge and consolidate the steps into one logical, numbered sequence.
3.  Eliminate redundant instructions and combine related steps.
4.  Ensure all terminal commands and code snippets are correctly formatted in Markdown code fences (\`\`\`) and placed within the correct step.
5.  Re-write the instructions for clarity and conciseness, making it easy for a user to follow.
6.  The final output must be a single, polished, step-by-step solution guide. Do not lose any critical commands or configuration details.

---
INSTRUCTIONAL SEGMENTS TO SYNTHESIZE:
${text}
---

Provide the single, synthesized solution guide below.
`;

// --- Timeline Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_TIMELINE = (text: string) => `
You are an expert historical analyst. Your task is to analyze the following document segment and extract key events, dates, and their outcomes in chronological order.

Follow these instructions:
1.  Format the output as a Markdown bulleted list. Each item should represent a single event or a closely related group of events.
2.  If a specific date or time is mentioned (e.g., "Q3 2023", "last Tuesday", "2024-01-15"), start the line with it in bold markdown (e.g., **Q3 2023:**).
3.  If no specific date is present, describe the event in its logical sequence relative to other events in this segment without a date prefix.
4.  Focus on actions, decisions, and outcomes.
5.  If no chronological events are found in this segment, state "No chronological events were identified in this segment."

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the chronological list of events for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_TIMELINE = (text: string) => `
You are an expert editor specializing in creating comprehensive timelines.
You will be given a series of chronologically ordered event lists from consecutive segments of a larger document.
Your task is to merge these lists into a single, cohesive timeline.

Follow these instructions:
1.  Combine all events from the input lists into a single master list.
2.  Sort the master list chronologically. If specific dates/times are present, use them for sorting. If dates are relative or absent, use the document's sequential flow to determine the order.
3.  Remove duplicate events and merge related information into a single, more comprehensive bullet point where appropriate.
4.  Ensure the final output is a clean, well-formatted Markdown bulleted list representing the complete timeline.

---
EVENT LISTS TO SYNTHESIZE:
${text}
---

Provide the single, synthesized timeline below.
`;

// --- Decision Matrix Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_DECISION_MATRIX = (text: string) => `
You are a business and technical analyst AI. Your task is to analyze the following document segment and extract any information related to a decision-making process where multiple options are being compared against various criteria.

Follow these instructions:
1.  Identify the **Options** being considered (e.g., Tool A, Strategy X, Vendor Z).
2.  Identify the **Criteria** used for evaluation (e.g., Cost, Performance, Ease of Use, Security).
3.  For each option, extract its **Score/Evaluation** against each criterion (e.g., $50k, 4/5, "High Risk", "Good").
4.  Format the extracted information clearly in Markdown, listing each option and its evaluated criteria.
5.  If no comparison or decision-making process is found in this segment, state "No decision matrix elements were identified in this segment."

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the extracted decision-making information for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_DECISION_MATRIX = (text: string) => `
You are an expert data synthesizer and technical writer. You have been given a series of notes extracted from a larger document, each detailing parts of a comparison between different options.
Your task is to synthesize all these notes into a single, comprehensive Decision Matrix table in Markdown format.

Follow these instructions:
1.  Identify all unique **Options** and **Criteria** from the notes. The Options should be the rows and the Criteria should be the columns of your table.
2.  Construct a Markdown table with the identified Options and Criteria.
3.  Fill in the cells of the table with the corresponding evaluation or score for each option against each criterion.
4.  If a score or evaluation for a specific cell is not mentioned in the notes, use "N/A" for that cell.
5.  Ensure the final output is a clean, well-formatted, and easy-to-read Markdown table. Do not include any text before or after the table.

---
NOTES TO SYNTHESIZE:
${text}
---

Provide the single, synthesized Decision Matrix Markdown table below.
`;

// --- Pitch Generator Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_PITCH_GENERATOR = (text: string) => `
You are a strategic analyst AI. Your task is to analyze the following document segment and extract raw information that could be used to build a pitch.
Do not invent information. Extract only what is present in the text.

Structure your output clearly. For each category, list relevant points as bullets. If no information is found for a category, state "Not mentioned in this segment."

**### Problems / Pain Points ###**
- (List any problems, challenges, or user pain points described.)

**### Solutions / Features ###**
- (List any proposed solutions, product features, or capabilities.)

**### Benefits / Outcomes ###**
- (List the positive results, benefits, or value propositions mentioned.)

**### Differentiators / Unique Selling Points ###**
- (List what makes the solution unique or better than alternatives.)

**### Target Audience / Users ###**
- (Identify who the product or solution is for.)

**### Market Context / "Why Now" ###**
- (Extract any information about market trends, timing, or the competitive landscape.)

**### Data / Proof Points ###**
- (List any metrics, statistics, or evidence of success.)

**### Call to Action ###**
- (Identify any next steps, requests, or calls to action.)

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the extracted pitch elements for the segment above.
`;


const REDUCE_SUMMARIES_PROMPT_TEMPLATE_PITCH_GENERATOR = (text: string) => `
You are an expert pitch deck writer and business strategist. You have been given a collection of raw notes extracted from a larger document.
Your task is to synthesize these notes into a cohesive and compelling multi-audience pitch.

**INSTRUCTIONS:**
1.  Analyze all the provided notes to understand the core narrative.
2.  Structure the output in Markdown with the following sections: **Problem**, **Solution**, **Why Now**, **Benefits**, **Differentiation**, **Proof**, and **Call to Action**.
3.  For EACH section, you MUST create tailored messaging for the following four audiences: **Technical**, **Non-Technical**, **Investors**, and **Users**.
4.  Frame the messaging for each audience based on their likely priorities:
    *   **Technical:** Focus on architecture, performance, scalability, integration.
    *   **Non-Technical:** Focus on ease of use, time savings, impact.
    *   **Investors:** Focus on market size, business model, competitive advantage, traction.
    *   **Users:** Focus on pain-point relief, workflow improvements, usability.
5.  If there is insufficient information for a specific audience in a specific section, it's acceptable to state "Key points are similar to the Non-Technical perspective." or provide a brief, logical inference based on the available data.
6.  The final output should be a well-organized, scannable document that tells the same core story from four different perspectives.

**EXAMPLE STRUCTURE FOR A SECTION:**
### Problem
*   **Technical:** (Your synthesized point for a technical audience here)
*   **Non-Technical:** (Your synthesized point for a non-technical audience here)
*   **Investors:** (Your synthesized point for an investor audience here)
*   **Users:** (Your synthesized point for a user audience here)

---
RAW NOTES TO SYNTHESIZE:
${text}
---

Provide the complete, multi-audience pitch document below.
`;

// --- Cause-Effect Chain Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_CAUSE_EFFECT_CHAIN = (text: string) => `
You are an expert systems analyst specializing in root cause analysis. Your task is to analyze the following document segment and extract all cause-and-effect chains.

A cause-effect chain has three parts:
1.  **Driver:** The initial event, decision, or condition (the root cause).
2.  **Outcome:** The immediate, direct result of the driver.
3.  **Consequence:** The broader, second-order impact or implication.

Follow these instructions:
1.  Identify all distinct causal chains in the text.
2.  Format each chain clearly in Markdown using a bulleted list structure as shown in the example below.
3.  If a chain is incomplete (e.g., only a driver and outcome are mentioned), extract the parts that are present.
4.  If no cause-effect chains are found in this segment, state "No cause-effect chains were identified in this segment."

**EXAMPLE FORMAT:**
*   **Driver:** High server load
*   **Outcome:** Increased latency
*   **Consequence:** Customer churn

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the extracted cause-effect chains for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_CAUSE_EFFECT_CHAIN = (text: string) => `
You are a senior systems analyst responsible for creating a final, comprehensive causal analysis report.
You have been given a series of cause-effect chains extracted from different segments of a larger document.
Your task is to synthesize these segments into a single, cohesive master list of chains.

Follow these instructions:
1.  Combine all unique cause-effect chains from the provided segments.
2.  Eliminate duplicate or redundant chains. If two chains describe the same causal link with slightly different wording, merge them into the most clear and comprehensive version.
3.  Look for opportunities to connect chains. If the 'Outcome' or 'Consequence' of one chain is the 'Driver' of another, try to link them into a longer, more insightful chain.
4.  Organize the final list logically, perhaps by grouping related drivers or themes if possible.
5.  The final output must be a clean, well-formatted Markdown list of the most significant cause-effect chains.

---
CAUSE-EFFECT CHAINS TO SYNTHESIZE:
${text}
---

Provide the single, synthesized list of cause-effect chains below.
`;

// --- SWOT Analysis Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_SWOT_ANALYSIS = (text: string) => `
You are an expert strategic analyst. Your task is to analyze the following document segment and extract information to build a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats).

- **Strengths:** Internal advantages or assets that support success.
- **Weaknesses:** Internal limitations or risks that could hinder success.
- **Opportunities:** External trends or openings that could be exploited.
- **Threats:** External risks or challenges that could cause harm.

Extract bullet points for each category based ONLY on the provided text. If no information is found for a category, state "Not mentioned in this segment."

**### Strengths ###**
- (List points here)

**### Weaknesses ###**
- (List points here)

**### Opportunities ###**
- (List points here)

**### Threats ###**
- (List points here)

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the extracted SWOT elements for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_SWOT_ANALYSIS = (text: string) => `
You are a senior business strategist creating a final SWOT analysis report.
You have been given a series of notes extracted from a larger document, categorized into Strengths, Weaknesses, Opportunities, and Threats.
Your task is to synthesize all these notes into a single, comprehensive SWOT Matrix table in Markdown format.

**Instructions:**
1.  Consolidate all points for each of the four categories, removing duplicates and merging similar ideas.
2.  Format the final output as a 2x2 Markdown table.
3.  The content of each cell should be a bulleted list. Use \`<br>\` for line breaks within a cell to ensure proper rendering.

**Table Structure:**
| Strengths (Internal) | Weaknesses (Internal) |
| :--- | :--- |
| - Point 1 <br> - Point 2 | - Point 1 <br> - Point 2 |
| **Opportunities (External)** | **Threats (External)** |
| - Point 1 <br> - Point 2 | - Point 1 <br> - Point 2 |

---
NOTES TO SYNTHESIZE:
${text}
---

Provide the single, synthesized SWOT Matrix Markdown table below.
`;

// --- Checklist Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_CHECKLIST = (text: string) => `
You are an expert project manager. Your task is to analyze the following document segment and extract all concrete, actionable tasks or checklist items.

Follow these instructions:
1.  Identify all distinct action items, to-do's, or next steps.
2.  Format each item as a Markdown checklist item.
3.  Use the following statuses based on the text:
    - \`- [ ]\` (or \`☐\`) for tasks that need to be done or are planned.
    - \`- [x]\` (or \`✔\`) for tasks explicitly mentioned as completed.
    - If status is ambiguous, default to not started (\`- [ ]\`).
4.  If metadata like an owner or due date is mentioned, include it parenthetically after the task description. (e.g., \`- [ ] Write unit tests (Owner: Jane, Due: EOD)\`).
5.  If no actionable checklist items are found in this segment, state "No actionable checklist items were identified in this segment."

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the extracted checklist items for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_CHECKLIST = (text: string) => `
You are a senior program manager responsible for creating a final, comprehensive action plan.
You have been given a series of checklist items extracted from different segments of a larger document.
Your task is to synthesize these segments into a single, cohesive, and logically ordered master checklist.

Follow these instructions:
1.  Combine all unique checklist items from the provided segments.
2.  Eliminate duplicate or redundant tasks. If two items describe the same task, merge them into the most complete version, taking the most advanced status (\`[x]\` > \`[ ]\`).
3.  Organize the final list in a logical order, such as by project phase or chronological sequence if it can be inferred.
4.  Ensure the final output is a clean, well-formatted Markdown checklist.

---
CHECKLISTS TO SYNTHESIZE:
${text}
---

Provide the single, synthesized master checklist below.
`;

// --- Dialog-Style Condensation Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_DIALOG_CONDENSATION = (text: string) => `
You are an expert meeting summarizer. Your task is to analyze the following segment of a transcript and condense it into a dialog-style summary.

Follow these instructions:
1.  Identify each speaker. Use their name or role (e.g., "PM," "Engineer").
2.  For each speaker, extract only their most essential statements, decisions, or questions. Strip all filler words, tangents, and repetition.
3.  Maintain the chronological order of the conversation as it appears in the segment.
4.  Apply one of the following tags where appropriate to highlight key moments:
    - **[Decision]** for when a decision is made.
    - **[Action]** for when a task is assigned or a next step is defined.
    - **[Concern]** for when a risk, problem, or disagreement is raised.
5.  Format each line as: \`* **Speaker:** Key statement [Optional Tag]\`
6.  If no clear dialog or speakers are present in this segment, state "No dialog was identified in this segment."

---
TRANSCRIPT SEGMENT TO ANALYZE:
${text}
---

Provide the condensed dialog for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_DIALOG_CONDENSATION = (text: string) => `
You are an expert editor responsible for creating a final, cohesive dialog-style summary of a meeting.
You have been given a series of condensed dialog segments from a larger transcript.
Your task is to merge these segments into a single, coherent conversation log.

Follow these instructions:
1.  Combine all dialog entries from the provided segments into a single, chronologically ordered list.
2.  Eliminate redundant or repeated statements. If two consecutive lines from the same speaker say similar things, merge them into one concise statement.
3.  Ensure the flow of conversation is logical and easy to follow.
4.  Maintain the original speaker attribution and any tags like [Decision], [Action], or [Concern].
5.  The final output must be a clean, well-formatted Markdown list representing the entire conversation's key points.

---
CONDENSED DIALOG SEGMENTS TO SYNTHESIZE:
${text}
---

Provide the single, synthesized dialog-style summary below.
`;

// --- Graph / Tree Outline Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_GRAPH_TREE_OUTLINE = (text: string) => `
You are an expert knowledge architect. Your task is to analyze the following document segment and structure its content into a hierarchical graph or tree outline.

Follow these instructions:
1.  Identify the central theme or root concept of the segment. This will be the top-level item.
2.  Identify key components, subtopics, or main ideas related to the root concept. These will be the first-level branches.
3.  Extract more granular details, examples, or facts and place them as child nodes under the appropriate branches.
4.  Use indented Markdown bullet points (\`*\`, \`  *\`, \`    *\`, etc.) to represent the hierarchy.
5.  The structure should be logical and reflect the relationships within the text.
6.  If the segment is simple and contains no clear hierarchy, present it as a flat list of key points.
7.  If no structured information can be extracted, state "No hierarchical structure was identified in this segment."

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the hierarchical tree outline for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_GRAPH_TREE_OUTLINE = (text: string) => `
You are an expert information synthesizer. You have been given a series of hierarchical tree outlines from consecutive segments of a larger document.
Your task is to merge these individual outlines into a single, cohesive, and comprehensive master tree outline.

Follow these instructions:
1.  Identify a common root concept for the entire document based on the provided outlines.
2.  Intelligently merge the branches and leaves from all outlines under the appropriate parent nodes in the master tree.
3.  Consolidate duplicate or overlapping information to create a clean and non-redundant structure.
4.  Re-organize the hierarchy if a more logical structure becomes apparent after seeing all the pieces.
5.  Maintain the indented Markdown bullet point format for the final output.
6.  The goal is to create a single tree that accurately represents the structure of the entire document.

---
TREE OUTLINES TO SYNTHESIZE:
${text}
---

Provide the single, synthesized master tree outline below.
`;

// --- Entity-Relationship Digest Prompts (NEW TWO-STEP PROCESS) ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_ENTITY_RELATIONSHIP_DIGEST = (text: string) => `
You are an expert data modeler and systems analyst. Your task is to analyze the following document segment and extract key entities, their attributes, and their relationships.

**Instructions:**
1.  Your output must ONLY be a textual digest. Do NOT create a Mermaid diagram.
2.  Format the digest as a nested Markdown bulleted list. An entity is a distinct object (e.g., User, Document), attributes are its properties (e.g., UserID), and relationships are how entities connect (e.g., User -> writes -> Document).
3.  If no entities or relationships are found, state "No entities or relationships were identified in this segment."

**EXAMPLE FORMAT:**
*   **Entity: [Entity Name]**
    *   **Attributes:** (Comma-separated list of attributes)
    *   **Relationships:**
        *   (e.g., \`writes -> Document\`)

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the extracted entity-relationship digest for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_ENTITY_RELATIONSHIP_DIGEST = (text: string) => `
You are a senior data architect creating a final, consolidated data model digest.
You have been given a series of entity-relationship lists from consecutive segments of a larger document.
Your task is to merge these into a single, cohesive, and de-duplicated master digest.

**INSTRUCTIONS:**
1.  **Synthesize the Textual Digest ONLY.** Do NOT create a Mermaid diagram or any separators.
2.  Identify all unique entities across all provided segments.
3.  For each unique entity, consolidate all its attributes and relationships. Remove duplicates.
4.  The final output should be a single, well-organized list of entities and their complete profiles in Markdown.
5.  If no entities or relationships were found in any of the inputs, the output should just be a single line stating that.

---
ENTITY-RELATIONSHIP LISTS TO SYNTHESIZE:
${text}
---

Provide the single, synthesized master entity-relationship digest below.
`;

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

// --- Rules Distiller Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_RULES_DISTILLER = (text: string) => `
You are an expert technical analyst and rule distiller. Your task is to analyze the following document segment and extract every hard technical rule, syntax requirement, or constraint.

Follow these instructions:
1.  Identify all enforceable directives, such as "must," "shall," "always," "never," or syntax definitions.
2.  Convert each rule into a concise, imperative statement (e.g., "Use...", "Do not...", "Ensure...").
3.  Format the output as a Markdown bulleted list.
4.  If possible, group rules under relevant categories (e.g., **Syntax**, **Security**, **Architecture**).
5.  If no rules or constraints are found in this segment, state "No rules were identified in this segment."

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the distilled rules for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_RULES_DISTILLER = (text: string) => `
You are a senior technical editor responsible for creating a final, comprehensive list of technical rules.
You have been given a series of distilled rule lists from different segments of a larger document.
Your task is to synthesize these segments into a single, cohesive, and de-duplicated master list of rules.

Follow these instructions:
1.  Combine all unique rules from the provided segments.
2.  Eliminate duplicate or redundant rules. If two rules describe the same constraint, merge them into the clearest and most concise version.
3.  Organize the final list under logical categories (e.g., **Syntax**, **Architecture**, **Security**, **Process**). Consolidate rules from different segments into the same category.
4.  Infer a title for the ruleset, such as "Rules Distilled from [Document Context]".
5.  The final output must be a clean, well-formatted Markdown list of commandments.

---
RULE LISTS TO SYNTHESIZE:
${text}
---

Provide the single, synthesized master list of rules below.
`;

// --- Metrics Dashboard Snapshot Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_METRICS_DASHBOARD = (text: string) => `
You are an expert data analyst AI. Your task is to analyze the following document segment and extract all Key Performance Indicators (KPIs) and their associated metric values.

Follow these instructions:
1.  Identify all measurable indicators (e.g., uptime, latency, revenue, error rate, active users).
2.  For each KPI, extract any of the following values if mentioned:
    *   **Current:** The most recent measurement.
    *   **Min / Max:** The observed lower and upper bounds.
    *   **Average / Median:** An aggregate baseline value.
    *   **Target / Threshold:** A benchmark or goal value.
    *   **Status:** An explicit status like "on-track", "at-risk", "off-track", or symbols (✔, ⚠, ✖).
3.  Also, identify the **Timeframe** for these metrics if mentioned (e.g., "Last 30 days", "Q2 2025").
4.  Format the extracted information as a clear Markdown list. If no specific timeframe is mentioned in this segment, state it.
5.  If no KPIs or metrics are found in this segment, state "No metrics were identified in this segment."

**EXAMPLE FORMAT:**
*   **Timeframe:** Last 30 Days
*   **KPI: API Uptime (%)**
    *   Current: 99.7
    *   Min: 98.9
    *   Max: 100
    *   Average: 99.5
    *   Target: 99.9
    *   Status: ⚠
*   **KPI: Response Latency (ms)**
    *   Current: 210
    *   Target: <=250
    *   Status: ✔

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the extracted metrics for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_METRICS_DASHBOARD = (text: string) => `
You are an expert data synthesizer and report generator. You have been given a series of notes extracted from a larger document, each detailing various Key Performance Indicators (KPIs) and their metrics.
Your task is to synthesize all these notes into a single, comprehensive Metrics Dashboard table in Markdown format.

Follow these instructions:
1.  Identify a single, overarching **Timeframe** for the report. If different timeframes are mentioned, select the most frequently cited one or the most recent one.
2.  Identify all unique **KPIs** from the notes. Each unique KPI should be a row in your table.
3.  Construct a Markdown table with the following columns: \`KPI\`, \`Current\`, \`Min\`, \`Max\`, \`Avg\`, \`Target\`, and \`Status\`.
4.  Fill in the cells of the table with the corresponding values for each KPI.
5.  If a value for a specific cell is not mentioned in the notes (e.g., 'Min' is missing for a KPI), use "N/A" for that cell.
6.  For the 'Status' column, use symbols (✔, ⚠, ✖) if they can be inferred from the text or are explicitly stated. Otherwise, use "N/A".
7.  The final output must be a clean, well-formatted, and easy-to-read Markdown table. It should be preceded by a title indicating the timeframe, like "### Service Monitoring Dashboard (Last 30 Days)". Do not include any other text before or after the title and table.

---
NOTES TO SYNTHESIZE:
${text}
---

Provide the single, synthesized Metrics Dashboard Markdown table below.
`;

// --- Q&A Pairs Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_QA_PAIRS = (text: string) => `
You are an expert analyst. Your task is to analyze the following document segment and extract all questions and their corresponding answers.

Follow these instructions:
1.  Identify all distinct questions, whether explicitly asked or implied.
2.  For each question, find the most direct and concise answer in the text.
3.  Format each pair as a Markdown bulleted list.
4.  Start each question with "**Q:**" and each answer on a new line with "**A:**".
5.  Apply one of the following tags to the answer where appropriate:
    - **[Decision]** for when an answer reflects an agreed-upon choice.
    - **[Action]** if the answer implies a next step or task.
    - **[Concern]** for when a risk or problem is identified.
    - **[Info]** for general background details or facts.
6.  If no clear questions and answers are present in this segment, state "No Q&A pairs were identified in this segment."

**EXAMPLE FORMAT:**
*   **Q:** What is the release target?
    **A:** End of Q3 2025. [Decision]
*   **Q:** What is the biggest risk?
    **A:** API refactor may slip. [Concern]

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the extracted Q&A pairs for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_QA_PAIRS = (text: string) => `
You are an expert editor responsible for creating a final, comprehensive Q&A document.
You have been given a series of Q&A pairs extracted from different segments of a larger document.
Your task is to synthesize these segments into a single, cohesive, and de-duplicated Q&A list.

Follow these instructions:
1.  Combine all unique Q&A pairs from the provided segments.
2.  Eliminate duplicate or redundant pairs. If two pairs ask the same question, merge them into the single best-worded question with the most complete and concise answer.
3.  Group the final list by theme if logical themes emerge (e.g., "Product," "Process," "Risks"). Use Markdown headers (e.g., "### Product") for grouping. If no clear themes emerge, present a single flat list.
4.  Ensure the final output is a clean, well-formatted Markdown list using the "**Q:**" and "**A:**" format.

---
Q&A PAIRS TO SYNTHESIZE:
${text}
---

Provide the single, synthesized Q&A list below.
`;

// --- Process Flow / Stepwise Map Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_PROCESS_FLOW = (text: string) => `
You are an expert process analyst. Your task is to analyze the following document segment and extract any process flows, sequences of actions, or step-by-step instructions.

Follow these instructions:
1.  Identify all concrete steps, actions, or states in the process described.
2.  Note any decision points (e.g., if/else conditions) and their outcomes.
3.  Identify any loops or repetitions.
4.  Format the output as a clear, ordered list (numbered or bulleted) in Markdown. Use indentation to show sub-steps or conditional branches.
5.  If no process flow is identified in this segment, state "No process flow was identified in this segment."

**EXAMPLE FORMAT:**
1.  Detect anomaly
2.  Verify alert
    *   If false positive → End
    *   If valid → Continue
3.  Classify severity

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the extracted process flow for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_PROCESS_FLOW = (text: string) => `
You are a senior process engineer responsible for creating a final, comprehensive process map.
You have been given a series of process flow segments extracted from a larger document.
Your task is to synthesize these segments into a single, cohesive, start-to-finish process flow.

Follow these instructions:
1.  Analyze all the provided steps and understand the overall workflow.
2.  Merge and consolidate the steps into one logical, ordered sequence.
3.  Eliminate redundant steps and combine related actions.
4.  Ensure all decision points and branches are correctly integrated into the main flow.
5.  Organize the final output as a clean, easy-to-follow numbered list in Markdown, using indentation for sub-steps and branches.
6.  The final output must be a single, polished process map.

---
PROCESS FLOW SEGMENTS TO SYNTHESIZE:
${text}
---

Provide the single, synthesized process flow map below.
`;

// --- RACI Snapshot Prompts ---

const CHUNK_SUMMARY_PROMPT_TEMPLATE_RACI_SNAPSHOT = (text: string) => `
You are an expert AI systems architect. Your task is to analyze the following document segment and extract tasks and their ownership into a RACI matrix format. The roles should be for AI Agents or automated systems, not humans.

A RACI matrix clarifies ownership:
- **R = Responsible:** The AI agent that performs the work.
- **A = Accountable:** The AI agent with final ownership and decision-making authority.
- **C = Consulted:** An AI agent that provides input or expertise.
- **I = Informed:** An AI agent that is kept updated on progress or decisions.

Follow these instructions:
1.  Identify all discrete tasks, activities, or deliverables.
2.  Identify the AI Agent roles involved (e.g., Data Processing Agent, User Interface Agent, Orchestrator Agent). Infer logical agent roles if not explicitly stated.
3.  For each task, assign the appropriate RACI marker (R, A, C, I) to each relevant AI agent role.
4.  Format the output as a clear Markdown list.
5.  If no tasks or roles are identified in this segment, state "No RACI elements were identified in this segment."

**EXAMPLE FORMAT:**
*   **Task:** Ingest raw user data
    *   Data Processing Agent: R
    *   Orchestrator Agent: A
    *   Security Agent: C
*   **Task:** Generate user summary
    *   Natural Language Agent: R
    *   Orchestrator Agent: A
    *   Data Processing Agent: I

---
DOCUMENT SEGMENT TO ANALYZE:
${text}
---

Provide the extracted RACI assignments for the segment above.
`;

const REDUCE_SUMMARIES_PROMPT_TEMPLATE_RACI_SNAPSHOT = (text: string) => `
You are an expert AI project manager responsible for creating a final, comprehensive RACI (Responsible, Accountable, Consulted, Informed) matrix.
You have been given a series of notes extracted from a larger document, each detailing various tasks and their ownership by different AI Agents.
Your task is to synthesize all these notes into a single, comprehensive RACI matrix table in Markdown format.

Follow these instructions:
1.  Identify all unique **Tasks** from the notes. Each unique task should be a row in your table.
2.  Identify all unique **AI Agent Roles** from the notes. Each unique role should be a column in your table.
3.  Construct a Markdown table with the Tasks as rows and Roles as columns.
4.  Fill in the cells of the table with the corresponding RACI marker (R, A, C, I).
5.  If a role has multiple assignments for the same task from different notes, consolidate them into the single most appropriate marker. There should only be one marker per cell.
6.  If a cell has no assignment, leave it blank.
7.  The final output must be a clean, well-formatted, and easy-to-read Markdown table. Do not include any text before or after the table.

---
NOTES TO SYNTHESIZE:
${text}
---

Provide the single, synthesized RACI Matrix Markdown table below.
`;


// --- Prompt Collections ---
export const CHUNK_SUMMARY_PROMPTS = {
  default: CHUNK_SUMMARY_PROMPT_TEMPLATE_DEFAULT,
  sessionHandoff: CHUNK_SUMMARY_PROMPT_TEMPLATE_SESSION_HANDOFF,
  readme: CHUNK_SUMMARY_PROMPT_TEMPLATE_README,
  solutionFinder: CHUNK_SUMMARY_PROMPT_TEMPLATE_SOLUTION_FINDER,
  timeline: CHUNK_SUMMARY_PROMPT_TEMPLATE_TIMELINE,
  decisionMatrix: CHUNK_SUMMARY_PROMPT_TEMPLATE_DECISION_MATRIX,
  pitchGenerator: CHUNK_SUMMARY_PROMPT_TEMPLATE_PITCH_GENERATOR,
  causeEffectChain: CHUNK_SUMMARY_PROMPT_TEMPLATE_CAUSE_EFFECT_CHAIN,
  swotAnalysis: CHUNK_SUMMARY_PROMPT_TEMPLATE_SWOT_ANALYSIS,
  checklist: CHUNK_SUMMARY_PROMPT_TEMPLATE_CHECKLIST,
  dialogCondensation: CHUNK_SUMMARY_PROMPT_TEMPLATE_DIALOG_CONDENSATION,
  graphTreeOutline: CHUNK_SUMMARY_PROMPT_TEMPLATE_GRAPH_TREE_OUTLINE,
  entityRelationshipDigest: CHUNK_SUMMARY_PROMPT_TEMPLATE_ENTITY_RELATIONSHIP_DIGEST,
  rulesDistiller: CHUNK_SUMMARY_PROMPT_TEMPLATE_RULES_DISTILLER,
  metricsDashboard: CHUNK_SUMMARY_PROMPT_TEMPLATE_METRICS_DASHBOARD,
  qaPairs: CHUNK_SUMMARY_PROMPT_TEMPLATE_QA_PAIRS,
  processFlow: CHUNK_SUMMARY_PROMPT_TEMPLATE_PROCESS_FLOW,
  raciSnapshot: CHUNK_SUMMARY_PROMPT_TEMPLATE_RACI_SNAPSHOT
};

export const REDUCE_SUMMARIES_PROMPTS = {
  default: REDUCE_SUMMARIES_PROMPT_TEMPLATE_DEFAULT,
  sessionHandoff: REDUCE_SUMMARIES_PROMPT_TEMPLATE_SESSION_HANDOFF,
  readme: REDUCE_SUMMARIES_PROMPT_TEMPLATE_README,
  solutionFinder: REDUCE_SUMMARIES_PROMPT_TEMPLATE_SOLUTION_FINDER,
  timeline: REDUCE_SUMMARIES_PROMPT_TEMPLATE_TIMELINE,
  decisionMatrix: REDUCE_SUMMARIES_PROMPT_TEMPLATE_DECISION_MATRIX,
  pitchGenerator: REDUCE_SUMMARIES_PROMPT_TEMPLATE_PITCH_GENERATOR,
  causeEffectChain: REDUCE_SUMMARIES_PROMPT_TEMPLATE_CAUSE_EFFECT_CHAIN,
  swotAnalysis: REDUCE_SUMMARIES_PROMPT_TEMPLATE_SWOT_ANALYSIS,
  checklist: REDUCE_SUMMARIES_PROMPT_TEMPLATE_CHECKLIST,
  dialogCondensation: REDUCE_SUMMARIES_PROMPT_TEMPLATE_DIALOG_CONDENSATION,
  graphTreeOutline: REDUCE_SUMMARIES_PROMPT_TEMPLATE_GRAPH_TREE_OUTLINE,
  entityRelationshipDigest: REDUCE_SUMMARIES_PROMPT_TEMPLATE_ENTITY_RELATIONSHIP_DIGEST,
  rulesDistiller: REDUCE_SUMMARIES_PROMPT_TEMPLATE_RULES_DISTILLER,
  metricsDashboard: REDUCE_SUMMARIES_PROMPT_TEMPLATE_METRICS_DASHBOARD,
  qaPairs: REDUCE_SUMMARIES_PROMPT_TEMPLATE_QA_PAIRS,
  processFlow: REDUCE_SUMMARIES_PROMPT_TEMPLATE_PROCESS_FLOW,
  raciSnapshot: REDUCE_SUMMARIES_PROMPT_TEMPLATE_RACI_SNAPSHOT
};


export const HIGHLIGHT_EXTRACTION_PROMPT_TEMPLATE = (text: string) => `
You are an AI assistant specializing in information extraction.
From the following summary text, identify and extract the 5 to 10 most important, impactful, or actionable highlights.
Each highlight should be a concise, self-contained sentence or two.
Return the highlights as a JSON array of objects, where each object has a "text" field.
Example format:
[
  {"text": "This is the first important highlight."},
  {"text": "This is another key takeaway."}
]
Do not include any text outside of the JSON array. The response must be only the JSON.

Here is the summary text to analyze:
---
${text}
---

Extract the JSON array of highlights below:
`;

export const NEXT_STEPS_TECHNICAL_SUMMARY_PROMPT_TEMPLATE = (summary: string) => `
You are a helpful strategic assistant. Based on the provided technical summary, suggest 3-5 insightful and actionable next steps or areas for further investigation.
These suggestions should be practical and relevant to the content of the summary.
Format your response as a JSON array of strings.
Example: ["Investigate the performance impact of the new algorithm.", "Schedule a follow-up meeting to discuss the deployment timeline."]
Do not include any text outside of the JSON array.

Technical Summary:
---
${summary}
---

Provide the JSON array of suggestions below:
`;

export const NEXT_STEPS_STYLE_MODEL_PROMPT_TEMPLATE = (styleDescription: string, styleTarget?: string) => `
You are a creative writing consultant. Based on the following extracted writing style model, provide 3-5 creative suggestions on how this style could be used or applied.
Think about different formats, audiences, or content types where this style would be effective.
If a specific person/character was targeted for the style analysis (${styleTarget || 'not specified'}), tailor the suggestions accordingly.
Format your response as a JSON array of strings.
Example: ["Use this witty and informal style to write a series of engaging blog posts.", "Apply this descriptive style to create a vivid short story."]
Do not include any text outside of the JSON array.

Extracted Writing Style Model:
---
${styleDescription}
---

Provide the JSON array of suggestions below:
`;

export const SINGLE_TEXT_STYLE_EXTRACTION_PROMPT_TEMPLATE = (text: string, styleTarget?: string) => `
You are an expert literary analyst. Your task is to analyze the following text and create a detailed "style model" or "style description".
This style model should be a comprehensive guide that another AI or human could use to replicate the writing style.

Consider the following aspects in your analysis:
1.  **Tone & Mood:** (e.g., formal, informal, witty, somber, academic, sarcastic, etc.)
2.  **Diction & Vocabulary:** (e.g., simple, complex, technical jargon, slang, descriptive, concise, etc.)
3.  **Sentence Structure:** (e.g., short and punchy, long and complex, varied, simple, compound, etc.)
4.  **Pacing & Rhythm:** (e.g., fast-paced, deliberate, meandering, etc.)
5.  **Use of Literary Devices:** (e.g., metaphors, similes, irony, humor, rhetorical questions, etc.)
6.  **Overall Voice:** (e.g., authoritative, personal, objective, narrative, etc.)

${styleTarget && styleTarget.trim().toLowerCase() !== 'all' && styleTarget.trim() !== '' ? `Focus specifically on the writing style of the character or person named "${styleTarget}". If this person's dialogue or narration isn't present, analyze the overall style and note that the target was not found.` : `Analyze the overall writing style of the entire text.`}

The output should be a well-structured description of the style, not a summary of the content.

Here is the text to analyze:
---
${text}
---

Provide your detailed style model below:
${CITATION_INSTRUCTION}
`;

export const CHUNK_STYLE_ANALYSIS_PROMPT_TEMPLATE = (text: string, styleTarget?: string) => `
You are an expert literary analyst. Your task is to analyze the following SEGMENT of a larger text and create a detailed "style model" or "style description" for this specific segment.
This style model should be a comprehensive guide that another AI or human could use to replicate the writing style found in this part of the text.

Consider the following aspects in your analysis:
1.  **Tone & Mood:** (e.g., formal, informal, witty, somber, academic, sarcastic, etc.)
2.  **Diction & Vocabulary:** (e.g., simple, complex, technical jargon, slang, descriptive, concise, etc.)
3.  **Sentence Structure:** (e.g., short and punchy, long and complex, varied, simple, compound, etc.)
4.  **Pacing & Rhythm:** (e.g., fast-paced, deliberate, meandering, etc.)
5.  **Use of Literary Devices:** (e.g., metaphors, similes, irony, humor, rhetorical questions, etc.)
6.  **Overall Voice:** (e.g., authoritative, personal, objective, narrative, etc.)

${styleTarget && styleTarget.trim().toLowerCase() !== 'all' && styleTarget.trim() !== '' ? `Focus specifically on the writing style of the character or person named "${styleTarget}". If this person's dialogue or narration isn't present, analyze the overall style and note that the target was not found.` : `Analyze the overall writing style of the entire text segment.`}

The output should be a well-structured description of the style, not a summary of the content.

Here is the text segment to analyze:
---
${text}
---

Provide your detailed style model for this segment below:
${CITATION_INSTRUCTION}
`;

export const REDUCE_STYLE_ANALYSES_PROMPT_TEMPLATE = (text: string, styleTarget?: string) => `
You are an expert editor and literary synthesizer.
You will be given a series of style analyses from consecutive segments of a larger document.
Your task is to synthesize these individual analyses into a single, cohesive, and comprehensive style model.
Identify the core, consistent stylistic elements and patterns. Note any variations or evolution of style if present.
Eliminate redundancy and create a unified, polished style description that represents the entire document.
${styleTarget && styleTarget.trim().toLowerCase() !== 'all' && styleTarget.trim() !== '' ? `The final model should focus on the style of "${styleTarget}".` : `The final model should represent the overall style.`}
The output should be a clean, well-structured style model.

Here are the style analyses to synthesize:
---
${text}
---

Provide the single, synthesized style model below:
${CITATION_INSTRUCTION}
`;

export const REWRITER_PROMPT_TEMPLATE = (style: string, instructions: string, length: RewriteLength) => {
  const lengthInstruction = {
    short: 'The final output should be concise, like a brief summary or a short social media post (approx. 100-200 words).',
    medium: 'The final output should be a moderate length, like a blog post or a detailed article section (approx. 500-800 words).',
    long: 'The final output should be extensive and detailed, like a chapter of a book or a long-form report (approx. 1500-2000 words).',
  }[length];

  return `
You are an expert writer and content creator. Your task is to rewrite the provided content (which may include text and images) into a new narrative.
Follow the user-provided style and instructions precisely.

**STYLE GUIDE:**
---
${style}
---

**ADDITIONAL INSTRUCTIONS:**
---
${instructions || "None provided."}
---

**DESIRED LENGTH:**
---
${lengthInstruction}
---

Now, analyze the following content pieces and rewrite them into a single, cohesive narrative according to the rules above.
If images are provided, describe them and weave their content into the story.
The output should be in well-formatted Markdown.
`;
};

export const CHUNK_MATH_FORMAT_PROMPT_TEMPLATE = (text: string) => `
You are an expert in LaTeX and MathJax formatting.
Your task is to reformat the following Markdown/text segment to ensure all mathematical notations are correctly formatted for MathJax rendering on GitHub.

**RULES:**
1.  **Do not change any content, text, or code.** Your only job is to fix the formatting of the math.
2.  Wrap all **inline** mathematical expressions and single variables in single dollar signs. Example: \`The equation is $E = mc^2$.\`.
3.  Wrap all **display** or **block** mathematical expressions (equations on their own lines) in double dollar signs. Example: \`$$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$\`.
4.  Ensure there are no blank lines inside a \`$$\` block.
5.  If the math is already correctly formatted with \`$\` or \`$$\`, do not change it.
6.  Preserve all original text, markdown formatting (like headers, lists, code blocks), and line breaks exactly as they are.

**Original Text Segment:**
---
${text}
---

**Reformatted Text Segment:**
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
