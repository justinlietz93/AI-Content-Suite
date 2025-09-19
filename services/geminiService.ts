import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Highlight, Mode } from '../types';
import { 
  GEMINI_FLASH_MODEL, 
  HIGHLIGHT_EXTRACTION_PROMPT_TEMPLATE,
  NEXT_STEPS_TECHNICAL_SUMMARY_PROMPT_TEMPLATE,
  NEXT_STEPS_STYLE_MODEL_PROMPT_TEMPLATE
} from '../constants';

/**
 * Cleans and parses a JSON string from an AI response, handling markdown fences.
 * @param rawText The raw string response from the AI.
 * @returns The parsed JSON object.
 * @throws An error with a `details` property containing the raw text if parsing fails.
 */
export const cleanAndParseJson = <T>(rawText: string): T => {
    let jsonStr = rawText.trim();
    
    // Regex to find content within ```json ... ``` or ``` ... ```
    // This is more robust and doesn't require the fence to be the only thing in the string.
    const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = jsonStr.match(fenceRegex);

    if (match && match[1]) {
        jsonStr = match[1].trim();
    }

    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        // Throw a new error that includes the ORIGINAL raw text for debugging
        const parseError = new Error(`Failed to parse JSON. Error: ${e instanceof Error ? e.message : String(e)}`);
        (parseError as any).details = rawText; // Attach the original, unmodified text
        throw parseError;
    }
};


// --- Retry Logic for API calls ---
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

const isRateLimitError = (error: any): boolean => {
    if (!error) return false;
    const errorString = String(error).toLowerCase();
    return errorString.includes('429') || errorString.includes('resource_exhausted') || errorString.includes('rate limit');
}

/**
 * Wraps a Gemini API call with retry logic for rate limiting errors.
 * @param apiCall The function that makes the Gemini API call.
 * @returns The result of the API call.
 */
const callGeminiWithRetry = async <T>(apiCall: () => Promise<T>): Promise<T> => {
    let retries = 0;
    let backoffMs = INITIAL_BACKOFF_MS;

    while (true) {
        try {
            return await apiCall();
        } catch (error) {
            if (isRateLimitError(error) && retries < MAX_RETRIES) {
                retries++;
                const jitter = Math.random() * 500;
                const waitTime = backoffMs + jitter;
                console.warn(`Rate limit exceeded. Retrying in ${waitTime.toFixed(0)}ms... (Attempt ${retries}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                backoffMs *= 2; // Exponential backoff
            } else {
                if (isRateLimitError(error)) {
                    console.error(`Exceeded maximum retries (${MAX_RETRIES}) for Gemini API call due to persistent rate limiting.`);
                }
                // Re-throw the error if it's not a rate limit error or if we've exhausted retries
                throw error;
            }
        }
    }
};


// --- Original Service Code ---
const getApiKey = (): string => {
  const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
    ? process.env.API_KEY
    : undefined;

  if (!apiKey) {
    const errorMsg = "API_KEY is not configured. Please set the API_KEY environment variable.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  return apiKey;
};

let aiInstance: GoogleGenAI | null = null;
try {
    aiInstance = new GoogleGenAI({ apiKey: getApiKey() });
} catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
}

export const ai = aiInstance;

export const generateText = async (prompt: string): Promise<string> => {
  if (!ai) throw new Error("Gemini AI SDK not initialized. API Key might be missing.");
  try {
    const response: GenerateContentResponse = await callGeminiWithRetry(() => 
      ai!.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: prompt,
      })
    );
    return response.text;
  } catch (error) {
    console.error('Error generating text from Gemini:', error);
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateMultiModalContent = async (parts: any[]): Promise<string> => {
    if (!ai) throw new Error("Gemini AI SDK not initialized. API Key might be missing.");
    try {
        const response: GenerateContentResponse = await callGeminiWithRetry(() =>
          ai!.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: { parts },
          })
        );
        return response.text;
    } catch (error) {
        console.error('Error generating multimodal content from Gemini:', error);
        throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const extractHighlightsFromJson = async (summaryText: string): Promise<Highlight[]> => {
  if (!ai) throw new Error("Gemini AI SDK not initialized. API Key might be missing.");
  const prompt = HIGHLIGHT_EXTRACTION_PROMPT_TEMPLATE(summaryText);
  let rawResponseText = '';
  try {
    const response = await callGeminiWithRetry(() =>
      ai!.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      })
    );
    rawResponseText = response.text;

    const parsedData = cleanAndParseJson<any>(rawResponseText);

    if (Array.isArray(parsedData)) {
      return parsedData.filter(item => item && typeof item.text === 'string') as Highlight[];
    } else if (parsedData && typeof parsedData.text === 'string') {
      return [parsedData as Highlight];
    }
    console.warn("Parsed JSON is not an array of highlights or a single highlight object:", parsedData);
    return [];

  } catch (error) {
    // Non-critical failure: Log the detailed error to the console and return a fallback,
    // so the main summary is still displayed.
    const rawOutput = (error as any).details || rawResponseText;
    console.error('Failed to parse highlights from Gemini. Raw output logged below.', error);
    console.error('--- RAW HIGHLIGHTS OUTPUT ---\n', rawOutput);
    
    // Fallback to simple line extraction
    const lines = rawOutput.split('\n');
    const fallbackHighlights: Highlight[] = lines
      .map(line => line.trim())
      .filter(line => line.startsWith('* ') || line.startsWith('- ') || /^\d+\.\s/.test(line))
      .map(line => ({ text: line.replace(/^(\* |- |\d+\.\s)/, '') }))
      .slice(0, 5); 

    if (fallbackHighlights.length > 0) {
      console.warn("Using fallback highlights due to JSON parsing error.");
      return fallbackHighlights;
    }
    return [];
  }
};

export const generateSuggestions = async (
  mode: Mode,
  processedContent: string,
  styleTargetText?: string 
): Promise<string[] | null> => {
  if (!ai) {
    console.warn("Gemini AI SDK not initialized. Cannot generate suggestions.");
    return null;
  }
  if (!processedContent || processedContent.trim() === "") {
    console.warn("No content provided to generate suggestions on.");
    return null;
  }

  let prompt = "";
  if (mode === 'technical') {
    prompt = NEXT_STEPS_TECHNICAL_SUMMARY_PROMPT_TEMPLATE(processedContent);
  } else if (mode === 'styleExtractor') {
    prompt = NEXT_STEPS_STYLE_MODEL_PROMPT_TEMPLATE(processedContent, styleTargetText);
  } else {
    return null;
  }

  let rawResponseText: string | undefined;
  try {
    const response = await callGeminiWithRetry(() =>
      ai!.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      })
    );
    rawResponseText = response.text;

    const parsedData = cleanAndParseJson<string[]>(rawResponseText);
    
    if (Array.isArray(parsedData) && parsedData.every(item => typeof item === 'string')) {
      const nonEmptySuggestions = parsedData.filter(s => s.trim() !== "");
      return nonEmptySuggestions.length > 0 ? nonEmptySuggestions : null;
    }
    console.warn("Parsed JSON for suggestions is not an array of strings or is empty:", parsedData);
    return null;
  } catch (error) {
    const rawOutput = (error as any).details || rawResponseText || 'Raw response not available.';
    console.error('Error generating/parsing next step suggestions from Gemini. Raw output logged below.', error);
    console.error('--- RAW SUGGESTIONS OUTPUT ---\n', rawOutput);
    return null; 
  }
};