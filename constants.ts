
import type { ProgressUpdate, RewriteLength } from './types';

export const GEMINI_FLASH_MODEL = 'gemini-2.5-pro';

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

export const CHUNK_SUMMARY_PROMPT_TEMPLATE = (text: string) => `
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

export const REDUCE_SUMMARIES_PROMPT_TEMPLATE = (text: string) => `
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
