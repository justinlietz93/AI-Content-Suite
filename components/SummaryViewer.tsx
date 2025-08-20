import React from 'react';
import type { SummaryOutput, StyleModelOutput, ProcessedOutput, Highlight, Mode } from '../types';

interface SummaryViewerProps {
  output: ProcessedOutput;
  mode: Mode;
}

const HighlightItem: React.FC<{ highlight: Highlight }> = ({ highlight }) => (
  <li className="p-3 bg-slate-700 rounded-md shadow hover:shadow-lg transition-shadow duration-150">
    <p className="text-text-primary text-sm">{highlight.text}</p>
    {highlight.relevance && (
      <p className="text-xs text-sky-400 mt-1">Relevance: {(highlight.relevance * 100).toFixed(0)}%</p>
    )}
  </li>
);

export const SummaryViewer: React.FC<SummaryViewerProps> = ({ output, mode }) => {
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // TODO: Consider adding a toast notification for feedback
      alert(`${type} copied to clipboard!`);
    }).catch(err => {
      console.error(`Failed to copy ${type}: `, err);
      alert(`Failed to copy ${type}. See console for details.`);
    });
  };

  if (mode === 'technical' && output && 'finalSummary' in output) {
    const techOutput = output as SummaryOutput;
    return (
      <div className="space-y-8">
        {techOutput.processingTimeSeconds !== undefined && (
          <div className="text-center text-sm text-text-secondary">
            Processing completed in {techOutput.processingTimeSeconds} seconds.
          </div>
        )}
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-semibold text-text-primary">Generated Summary</h2>
            <button 
              onClick={() => copyToClipboard(techOutput.finalSummary, "Summary")}
              className="text-xs px-3 py-1 bg-sky-700 text-sky-100 rounded hover:bg-sky-600 transition-colors"
              aria-label="Copy summary to clipboard"
            >
              Copy Summary
            </button>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg max-h-96 overflow-y-auto shadow-inner">
            <p className="text-text-primary whitespace-pre-wrap text-sm leading-relaxed">{techOutput.finalSummary}</p>
          </div>
        </div>

        {techOutput.highlights && techOutput.highlights.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-semibold text-text-primary">Key Highlights</h2>
              <button 
                onClick={() => copyToClipboard(techOutput.highlights.map(h => h.text).join('\n'), "Highlights")}
                className="text-xs px-3 py-1 bg-sky-700 text-sky-100 rounded hover:bg-sky-600 transition-colors"
                aria-label="Copy highlights to clipboard"
              >
                Copy Highlights
              </button>
            </div>
            <ul className="space-y-3 max-h-96 overflow-y-auto p-1">
              {techOutput.highlights.map((highlight, index) => (
                <HighlightItem key={index} highlight={highlight} />
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  } else if (mode === 'styleExtractor' && output && 'styleDescription' in output) {
    const styleOutput = output as StyleModelOutput;
    return (
      <div className="space-y-8">
        {styleOutput.processingTimeSeconds !== undefined && (
          <div className="text-center text-sm text-text-secondary">
            Processing completed in {styleOutput.processingTimeSeconds} seconds.
          </div>
        )}
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-semibold text-text-primary">Extracted Style Model</h2>
            <button 
              onClick={() => copyToClipboard(styleOutput.styleDescription, "Style Model")}
              className="text-xs px-3 py-1 bg-sky-700 text-sky-100 rounded hover:bg-sky-600 transition-colors"
              aria-label="Copy style model to clipboard"
            >
              Copy Style Model
            </button>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg max-h-[32rem] overflow-y-auto shadow-inner">
            <p className="text-text-primary whitespace-pre-wrap text-sm leading-relaxed">{styleOutput.styleDescription}</p>
          </div>
        </div>
      </div>
    );
  }
  return null; // Should not happen if props are correct
};