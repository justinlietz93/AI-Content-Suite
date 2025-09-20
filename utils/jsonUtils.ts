
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
