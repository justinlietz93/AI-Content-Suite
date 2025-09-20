/**
 * Reads file content as text.
 * @param file The file to read.
 * @returns A promise that resolves with the file content as a string.
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

/**
 * Converts a File object to a provider-agnostic chat message part.
 * Handles images by converting to base64 and other files as text.
 * @param file The file to convert.
 * @returns A promise that resolves to a message part object understood by supported providers.
 */
export const fileToGenerativePart = async (file: File): Promise<any> => {
    if (file.type.startsWith('image/')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = (reader.result as string).split(',')[1];
                resolve({
                    inlineData: {
                        mimeType: file.type,
                        data: base64Data,
                    },
                });
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    } else { // Assume text-based
        const text = await readFileAsText(file);
        return { text: `--- DOCUMENT START: ${file.name} ---\n\n${text}\n\n--- DOCUMENT END: ${file.name} ---` };
    }
};
