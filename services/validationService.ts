// This service uses the Mermaid library, which is globally available from the script tag in index.html
declare var mermaid: any;

interface ValidationResult {
    isValid: boolean;
    error?: Error;
}

/**
 * Validates Mermaid.js syntax using the client-side library.
 * This function is designed to be called before attempting to render a diagram.
 * @param code The Mermaid diagram code to validate.
 * @returns A promise that resolves to a ValidationResult object.
 */
export const validateMermaidSyntax = async (code: string): Promise<ValidationResult> => {
    if (typeof mermaid === 'undefined' || typeof mermaid.parse !== 'function') {
        console.warn('Mermaid library not available for validation.');
        // If the library isn't loaded, we can't validate, so we assume it's valid to avoid blocking.
        return { isValid: true };
    }
    try {
        // The parse method will throw an error if the syntax is invalid.
        // We need to provide an object to suppress the error being thrown from the function itself,
        // allowing us to catch it and handle it gracefully.
        await mermaid.parse(code, { suppressErrors: false });
        return { isValid: true };
    } catch (error) {
        return { isValid: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
};
