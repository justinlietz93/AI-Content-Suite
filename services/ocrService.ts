import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

export interface OcrProgress {
  status: string;
  progress: number; // A value from 0 to 1 representing the overall progress
  page: number;
  totalPages: number;
}

// Set the worker source for pdf.js from the jsDelivr CDN for better reliability.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

/**
 * Extracts text from a PDF file using a parallelized OCR process.
 * @param file The PDF file to process.
 * @param onProgress A callback function to report progress.
 * @returns A promise that resolves with the extracted text as a string.
 */
export const ocrPdf = async (file: File, onProgress: (update: OcrProgress) => void): Promise<string> => {
    onProgress({ status: 'Initializing OCR engine...', progress: 0, page: 0, totalPages: 0 });

    // Determine a reasonable level of parallelism, capping at 4 to avoid overwhelming the system.
    const concurrency = navigator.hardwareConcurrency ? Math.max(1, Math.min(navigator.hardwareConcurrency, 4)) : 2;
    
    // 1. Correctly setup Tesseract scheduler and workers for parallel processing
    const scheduler = Tesseract.createScheduler();
    // Create promises for each worker's creation.
    const workerPromises = Array.from({ length: concurrency }, () => Tesseract.createWorker('eng'));
    // Await for all workers to be fully initialized.
    const workers = await Promise.all(workerPromises);
    // Add the initialized workers to the scheduler.
    for (const worker of workers) {
        scheduler.addWorker(worker);
    }
    
    onProgress({ status: `Loading PDF with ${concurrency} parallel workers...`, progress: 0.02, page: 0, totalPages: 0 });

    // 2. Load PDF document from the file
    const fileReader = new FileReader();
    const typedArray = await new Promise<Uint8Array>((resolve, reject) => {
        fileReader.onload = () => resolve(new Uint8Array(fileReader.result as ArrayBuffer));
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });

    let pdf;
    try {
        pdf = await pdfjsLib.getDocument(typedArray).promise;
    } catch (error: any) {
        console.error("Error loading PDF document:", error);
        // Check for specific PDF parsing errors and provide a user-friendly message.
        if (error.name === 'InvalidPDFException' || (error.message && error.message.includes('Invalid PDF structure'))) {
            throw new Error(`The file "${file.name}" appears to be corrupted or is not a valid PDF. Please try a different file.`);
        }
        // Re-throw other types of errors
        throw error;
    }
    
    const totalPages = pdf.numPages;
    let completedPages = 0;

    onProgress({ status: `Loaded PDF with ${totalPages} pages.`, progress: 0.05, page: 0, totalPages });

    // 3. Create a recognition job for each page
    const pagePromises = Array.from({ length: totalPages }, async (_, i) => {
        const pageNum = i + 1;
        try {
            // Render the PDF page to an in-memory canvas
            const page = await pdf.getPage(pageNum);
            // Using a moderate scale is a good balance of accuracy and performance.
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            
            if (!context) {
                throw new Error(`Could not get 2D context for page ${pageNum}`);
            }
            
            await page.render({ canvasContext: context, viewport: viewport }).promise;

            // Add the recognition job to the scheduler, which will assign it to an available worker.
            const { data: { text } } = await scheduler.addJob('recognize', canvas);
            
            // Atomically update progress
            completedPages++;
            onProgress({
                status: `Recognizing... Page ${completedPages} of ${totalPages}`,
                // OCR is ~90% of the work after loading
                progress: 0.05 + (completedPages / totalPages) * 0.90,
                page: completedPages,
                totalPages
            });
            
            return { text, pageNum };
        } catch (error) {
            console.error(`Failed to process page ${pageNum}:`, error);
            completedPages++;
            onProgress({
                status: `Skipping page ${completedPages} of ${totalPages} due to error.`,
                progress: 0.05 + (completedPages / totalPages) * 0.90,
                page: completedPages,
                totalPages
            });
            return { text: `\n\n[Error processing page ${pageNum}: OCR failed for this page.]\n\n`, pageNum };
        }
    });

    // 4. Wait for all parallel jobs to complete
    const pageResults = await Promise.all(pagePromises);

    // 5. Clean up Tesseract workers and scheduler to free up resources
    onProgress({ status: 'Finalizing and cleaning up...', progress: 0.98, page: totalPages, totalPages });
    await scheduler.terminate();

    // 6. Assemble the final text, ensuring pages are in the correct order
    const sortedResults = pageResults.sort((a, b) => a.pageNum - b.pageNum);
    const fullText = sortedResults
        .map(result => result.text)
        .join('\n\n--- Page Break ---\n\n');
        
    onProgress({ status: 'OCR Complete.', progress: 1, page: totalPages, totalPages });
    
    return fullText;
};