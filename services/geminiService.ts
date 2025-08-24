
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Highlight, Mode } from '../types';
import { 
  GEMINI_FLASH_MODEL, 
  HIGHLIGHT_EXTRACTION_PROMPT_TEMPLATE,
  NEXT_STEPS_TECHNICAL_SUMMARY_PROMPT_TEMPLATE,
  NEXT_STEPS_STYLE_MODEL_PROMPT_TEMPLATE
} from '../constants';

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

let ai: GoogleGenAI | null = null;
try {
    ai = new GoogleGenAI({ apiKey: getApiKey() });
} catch (e) {
    console.error("Failed to initialize GoogleGenAI:", e);
}

export const generateText = async (prompt: string): Promise<string> => {
  if (!ai) throw new Error("Gemini AI SDK not initialized. API Key might be missing.");
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('Error generating text from Gemini:', error);
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateMultiModalContent = async (parts: any[]): Promise<string> => {
    if (!ai) throw new Error("Gemini AI SDK not initialized. API Key might be missing.");
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL,
            contents: { parts },
        });
        return response.text;
    } catch (error) {
        console.error('Error generating multimodal content from Gemini:', error);
        throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const extractHighlightsFromJson = async (summaryText: string): Promise<Highlight[]> => {
  if (!ai) throw new Error("Gemini AI SDK not initialized. API Key might be missing.");
  const prompt = HIGHLIGHT_EXTRACTION_PROMPT_TEMPLATE(summaryText);
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?([\s\S]*?)\n?\s*```$/; 
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    try {
      const parsedData = JSON.parse(jsonStr);
      if (Array.isArray(parsedData)) {
        return parsedData.filter(item => item && typeof item.text === 'string') as Highlight[];
      } else if (parsedData && typeof parsedData.text === 'string') {
        return [parsedData as Highlight];
      }
      console.warn("Parsed JSON is not an array of highlights or a single highlight object:", parsedData);
      return [];
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini for highlights:", e, "Raw text:", response.text);
      const lines = response.text.split('\n');
      const fallbackHighlights: Highlight[] = lines
        .map(line => line.trim())
        .filter(line => line.startsWith('* ') || line.startsWith('- ') || /^\d+\.\s/.test(line))
        .map(line => ({ text: line.replace(/^(\* |- |\d+\.\s)/, '') }))
        .slice(0, 5); 
      if (fallbackHighlights.length > 0) {
        console.warn("Using fallback highlights due to JSON parsing error.");
        return fallbackHighlights;
      }
      throw new Error('Failed to parse highlights JSON from Gemini response and no fallback available.');
    }
  } catch (error) {
    console.error('Error extracting highlights from Gemini:', error);
    throw new Error(`Gemini API error during highlight extraction: ${error instanceof Error ? error.message : String(error)}`);
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
    console.warn("Unknown mode for suggestions:", mode);
    return null;
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?([\s\S]*?)\n?\s*```$/;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr);
    if (Array.isArray(parsedData) && parsedData.every(item => typeof item === 'string')) {
      const nonEmptySuggestions = (parsedData as string[]).filter(s => s.trim() !== "");
      return nonEmptySuggestions.length > 0 ? nonEmptySuggestions : null;
    }
    console.warn("Parsed JSON for suggestions is not an array of strings or is empty:", parsedData, "Raw text:", response.text);
    return null;
  } catch (error) {
    console.error('Error generating next step suggestions from Gemini:', error, "Prompt used:", prompt);
    return null; 
  }
};