
import React, { MouseEvent } from 'react';
import { generateReport } from '../services/reportGenerator';
import type { ProcessedOutput, Mode } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  output: ProcessedOutput | null;
  mode: Mode;
  styleTarget?: string;
  nextStepSuggestions: string[] | null;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, output, mode, styleTarget, nextStepSuggestions }) => {
  const handleDownload = (format: 'html' | 'md') => {
    if (!output) return;

    const content = generateReport(format, output, mode, styleTarget, nextStepSuggestions);
    const mimeType = format === 'html' ? 'text/html' : 'text/markdown';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI-Report-${mode}-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };
  
  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 transition-opacity duration-300 animate-fade-in-scale"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
    >
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300">
        <header className="flex items-center justify-between p-4 sm:p-5 border-b border-border-color">
          <h2 id="modal-title" className="text-lg sm:text-xl font-semibold text-text-primary">Download Report</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors" aria-label="Close modal">
            <XCircleIcon className="w-7 h-7" />
          </button>
        </header>
        
        <div className="p-6 sm:p-8">
            <p className="text-text-secondary mb-6 text-sm">Choose a format to download your generated report. The file will be saved to your device.</p>
            <div className="space-y-4">
                <button
                    onClick={() => handleDownload('html')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
                >
                    <DownloadIcon className="w-5 h-5" />
                    <span>Download as HTML</span>
                </button>
                <button
                    onClick={() => handleDownload('md')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-secondary text-text-primary font-semibold rounded-lg hover:bg-slate-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-surface"
                >
                    <DownloadIcon className="w-5 h-5" />
                    <span>Download as Markdown (.md)</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};