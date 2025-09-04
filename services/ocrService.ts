
declare var Tesseract: any;
declare var pdfjsLib: any;

export interface OcrProgress {
  status: string;
  progress: number; // A value from 0 to 1 representing the overall progress
  page: number;
  totalPages: number;
}

/**
 * Extracts text from a PDF file using OCR.
 * @param file The PDF file to process.
 * @param onProgress A callback function to report progress.
 * @returns A promise that resolves with the extracted text as a string.
 */
export const ocrPdf = async (file: File, onProgress: (update: OcrProgress) => void): Promise<string> => {
    onProgress({ status: 'Loading PDF...', progress: 0, page: 0, totalPages: 0 });

    const fileReader = new FileReader();
    const typedArray = await new Promise<Uint8Array>((resolve, reject) => {
        fileReader.onload = () => resolve(new Uint8Array(fileReader.result as ArrayBuffer));
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });

    const pdf = await pdfjsLib.getDocument(typedArray).promise;
    const totalPages = pdf.numPages;
    let fullText = '';
    let currentPageForProgress = 0;

    onProgress({ status: 'Initializing OCR engine...', progress: 0, page: 0, totalPages });

    const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m: any) => {
            if (m.status === 'recognizing text') {
                // Tesseract's progress is for the current page recognition
                const pageProgress = m.progress;
                // Calculate overall progress across all pages
                const overallProgress = ((currentPageForProgress - 1) + pageProgress) / totalPages;
                onProgress({
                    status: `Recognizing text...`,
                    progress: overallProgress,
                    page: currentPageForProgress,
                    totalPages,
                });
            }
        },
    });

    for (let i = 1; i <= totalPages; i++) {
        currentPageForProgress = i;
        const overallProgressBeforeRecognition = (i - 1) / totalPages;
        onProgress({ status: `Rendering page ${i} for OCR`, progress: overallProgressBeforeRecognition, page: i, totalPages });
        
        const page = await pdf.getPage(i);
        // Using a higher scale can improve OCR accuracy
        const viewport = page.getViewport({ scale: 2.5 }); 
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (context) {
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const { data: { text } } = await worker.recognize(canvas);
            fullText += text + '\n\n';
            if (i < totalPages) {
                fullText += '--- Page Break ---\n\n';
            }
        }
    }

    onProgress({ status: 'Finalizing...', progress: 1, page: totalPages, totalPages });
    await worker.terminate();
    return fullText;
};
