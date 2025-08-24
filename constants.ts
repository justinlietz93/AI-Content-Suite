
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

export const INITIAL_PROGRESS: ProgressUpdate = {
  stage: 'Idle',
  percentage: 0,
  message: 'Waiting for file selection.'
};

const CITATION_INSTRUCTION = `\n\nIf any external links, references, or citations are included, they MUST be listed at the end of the entire response in a dedicated "References" section, formatted using a professional research standard (e.g., APA or MLA style).`;

// --- Prompts for Technical Summarizer ---
export const CHUNK_SUMMARY_PROMPT_TEMPLATE = (text: string): string => 
`You will be given a very large segment of a highly technical conversation transcript. Your task is to summarize this segment concisely yet comprehensively.
Focus meticulously on extracting all key information, critical technical details, complex decisions, specific data points, and important outcomes.
The summary must be dense, exceptionally well-organized, and capture the absolute essence of this large excerpt. Do not lose critical details due to the volume of text.
Ensure your summary is coherent and stands alone as an accurate representation of this segment.${CITATION_INSTRUCTION}
Segment of Technical Transcript:
---
${text}
---
Concise and Comprehensive Summary of the Large Segment:`;

export const REDUCE_SUMMARIES_PROMPT_TEMPLATE = (summariesText: string): string =>
`Combine the following set of related technical summaries into a single, unified, and more comprehensive summary. These input summaries themselves might be long and detailed, derived from large text segments.
Your goal is to synthesize them, eliminating redundancy while meticulously preserving all key information, technical details, decisions, and outcomes present in the input summaries.
The combined summary should be dense, well-structured, logically organized, and flow naturally as a single coherent narrative.${CITATION_INSTRUCTION}
Input Summaries:
---
${summariesText}
---
Combined Comprehensive Summary:`;

export const HIGHLIGHT_EXTRACTION_PROMPT_TEMPLATE = (text: string): string =>
`From the following detailed technical summary, extract the most important and impactful key highlights. These highlights should represent critical facts, pivotal decisions, or significant outcomes.
Return the highlights as a JSON array of objects. Each object must have a "text" field containing the highlight (string). Optionally, include a "relevance" field (number between 0.0 and 1.0, where 1.0 is highest relevance).
For example: [{"text": "Key finding A was discovered.", "relevance": 0.95}, {"text": "Decision B was made due to factor C."}]
Ensure the output is ONLY the JSON array, without any surrounding text or markdown.
Detailed Technical Summary:
---
${text}
---
JSON Array of Key Highlights:`;


// --- Prompts for Style Extractor ---

const BASE_STYLE_ANALYSIS_INSTRUCTIONS = `Describe the key characteristics of this style in a comprehensive manner. This description should serve as a "style model" that could be used by an LLM to effectively recreate or emulate this writing/response style.
Focus on elements such as:
- Tone (e.g., formal, informal, witty, sarcastic, academic, melancholic, enthusiastic)
- Vocabulary (e.g., simple, complex, technical, colloquial, archaic, modern, note the use of jargon, but avoid stating the specific words)
- Sentence Structure (e.g., short and declarative, long and complex, compound, simple, use of passive/active voice, typical sentence length)
- Pacing and Rhythm (e.g., fast-paced, leisurely, staccato, flowing)
- Use of Literary Devices (e.g., metaphors, similes, irony, hyperbole, understatement, alliteration, personification)
- Emotional Expression (e.g., overt, subtle, range of emotions expressed)
- Common Phrases or Idioms favored by the style.
- Unique Quirks or Mannerisms (e.g., specific ways of starting/ending sentences, repeated words/phrases, typical exclamations or interjections).
- Point of View (e.g., first person, third person limited, third person omniscient).
- Level of Detail and Description.
- Dialogue Style (if applicable, how characters speak).
Present the output as a detailed, structured textual description. Avoid any conversational preamble or concluding remarks. Output ONLY the style model description. The style should be time period agnostic and not tied to specific events or topics. You are extracting style, not content.${CITATION_INSTRUCTION}`;

const getFocusInstructionAndTargetDescription = (target?: string): { focusInstruction: string, targetDescription: string } => {
  let focusInstruction = "Your task is to deeply analyze the overall writing style presented in this text segment.";
  let targetDescription = "the provided text segment";

  if (target && target.trim().toLowerCase() !== 'all' && target.trim() !== '') {
    focusInstruction = `Your task is to deeply analyze the writing style of "${target}" as presented in this text segment. If "${target}" is not clearly identifiable or their style is not distinct, note this and analyze the most prominent style or overall style of the text segment instead. Focus ONLY on the style elements present within THIS SEGMENT. Do not include the specific subject matter unless it directly informs the style. If you must do so, then try to use abstractions or concepts rather than specific details.`;
    targetDescription = `"${target}" in this segment`;
  } else if (target && target.trim().toLowerCase() === 'all') {
    focusInstruction = "Your task is to deeply analyze the overall writing style presented in this text segment, considering all elements to form a comprehensive model for this part of the text. If multiple distinct voices are present, try to capture the essence of the most dominant or representative style, or provide a composite view if appropriate for this segment. Focus ONLY on the style elements present within THIS SEGMENT. Do not include the specific subject matter unless it directly informs the style. If you must do so, then try to use abstractions or concepts rather than specific details.";
    targetDescription = "the overall style in this segment";
  }
  return { focusInstruction, targetDescription };
};

// Used for single, small text inputs (fallback or direct use if text is small)
export const SINGLE_TEXT_STYLE_EXTRACTION_PROMPT_TEMPLATE = (text: string, target?: string): string => {
  const { focusInstruction, targetDescription } = getFocusInstructionAndTargetDescription(target);
  return `You will be given a text. ${focusInstruction}
${BASE_STYLE_ANALYSIS_INSTRUCTIONS}
Input Text:
---
${text}
---
Detailed Style Model Description for ${targetDescription}:`;
};

// New prompt for analyzing a single chunk of text for style
export const CHUNK_STYLE_ANALYSIS_PROMPT_TEMPLATE = (textChunk: string, target?: string): string => {
  const { focusInstruction, targetDescription } = getFocusInstructionAndTargetDescription(target);
  return `You will be given a segment of a larger text. ${focusInstruction}
Focus ONLY on the style elements present within THIS SEGUMENT.
${BASE_STYLE_ANALYSIS_INSTRUCTIONS}
Text Segment:
---
${textChunk}
---
Detailed Style Model Description for ${targetDescription}:`;
};

// New prompt for combining multiple style analyses from chunks
export const REDUCE_STYLE_ANALYSES_PROMPT_TEMPLATE = (styleAnalysesText: string, target?: string): string => {
  const targetInfo = (target && target.trim().toLowerCase() !== 'all' && target.trim() !== '') 
    ? ` for "${target}"` 
    : " for the overall text";
  
  return `You are given a set of style analyses, each derived from a segment of a larger text. Your task is to synthesize these individual analyses into a single, unified, and comprehensive style model${targetInfo}.
Identify common themes, consistent stylistic choices, and overarching patterns from the input analyses. Resolve any minor discrepancies or variations into a cohesive description.
The final style model should be more holistic and representative than any single input analysis.
${BASE_STYLE_ANALYSIS_INSTRUCTIONS}
Input Style Analyses:
---
${styleAnalysesText}
---
Combined and Unified Style Model Description${targetInfo}:`;
};

// --- Prompts for Rewriter ---
export const REWRITER_PROMPT_TEMPLATE = (
  style: string, 
  instructions: string, 
  length: RewriteLength
): string => {
  const lengthMap = {
    short: 'a short piece, approximately 250 words.',
    medium: 'a medium-length piece, approximately 750 words.',
    long: 'a long, detailed piece, approximately 2000 words.',
  };

  let prompt = `You are an expert writer and content synthesizer. Your task is to analyze the following user-provided content (which may include text documents and images) and rewrite it into a single, cohesive narrative.

**Primary Goal:** Create a new, original piece of writing based on the provided materials.

---

**1. Writing Style:**
Adopt the following style for your response:
${style || 'A clear, engaging, and well-structured narrative. The tone should be neutral and informative.'}

---

**2. Desired Length:**
The final output should be ${lengthMap[length]}

---
`;

  if (instructions) {
    prompt += `**3. Additional Instructions:**\nFollow these instructions carefully:\n${instructions}\n\n---\n\n`;
  }

  prompt += `**4. Content to Synthesize:**
The user has provided the content in the subsequent parts of this prompt. Please analyze all text and images to inform your narrative.

---

**Final Output Instructions:**
- The output must be a single, continuous piece of writing.
- Format the entire response in Markdown.
- Do not add any conversational preamble or concluding remarks. Begin directly with the narrative.`;

  return prompt;
};


// --- Prompts for Next Step Suggestions ---
// Max 3000 chars for summary/styleDescription to keep suggestion prompt focused and within limits.
const MAX_CHARS_FOR_SUGGESTION_CONTEXT = 3000;

export const NEXT_STEPS_TECHNICAL_SUMMARY_PROMPT_TEMPLATE = (summary: string): string =>
`You are an assistant that provides actionable next steps.
Given the following technical summary (or a truncated version if it was very long):
---
${summary.substring(0, MAX_CHARS_FOR_SUGGESTION_CONTEXT)}
---
Suggest 3 to 5 concise and actionable next steps a user might take with this information. Examples: "Share key findings with the project team", "Integrate this summary into technical documentation", "Schedule a follow-up meeting to discuss implications X and Y", "Identify action items based on critical decisions".
Focus on the core message of the provided text for suggestions.
Return the suggestions as a JSON array of strings. For example: ["Actionable step 1", "Another actionable step"].
Ensure the output is ONLY the JSON array, without any surrounding text or markdown.`;

export const NEXT_STEPS_STYLE_MODEL_PROMPT_TEMPLATE = (styleDescription: string, styleTarget?: string): string => {
  const targetContext = styleTarget && styleTarget.trim() !== '' && styleTarget.trim().toLowerCase() !== 'all'
    ? ` for the style of "${styleTarget}"`
    : ` for the overall style`;

  return `You are an assistant that provides actionable next steps.
Given the following extracted writing style model${targetContext} (or a truncated version if it was very long):
---
${styleDescription.substring(0, MAX_CHARS_FOR_SUGGESTION_CONTEXT)}
---
Suggest 3 to 5 concise and actionable next steps a user might take with this style model. Examples: "Use this model to generate new content emulating this style", "Refine the style model by providing more text examples", "Compare this extracted style with other known writing styles", "Apply this style to re-write existing short texts for consistency".
Focus on the essence of the provided style model for suggestions.
Return the suggestions as a JSON array of strings. For example: ["Creative action 1", "Practical application 2"].
Ensure the output is ONLY the JSON array, without any surrounding text or markdown.`;
};