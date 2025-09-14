
import React, { useEffect, useRef } from 'react';
import type { SummaryOutput, StyleModelOutput, ProcessedOutput, Highlight, Mode, RewriterOutput, MathFormatterOutput } from '../types';

declare var marked: any;
declare var mermaid: any;
declare var svgPanZoom: any;
declare global {
    interface Window {
        MathJax: any;
    }
}


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
  const contentRef = useRef<HTMLDivElement>(null);
  const summaryContentRef = useRef<HTMLDivElement>(null);
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const panZoomInstanceRef = useRef<any>(null);


  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // TODO: Consider adding a toast notification for feedback
      alert(`${type} copied to clipboard!`);
    }).catch(err => {
      console.error(`Failed to copy ${type}: `, err);
      alert(`Failed to copy ${type}. See console for details.`);
    });
  };

  useEffect(() => {
    const renderMarkdown = (ref: React.RefObject<HTMLDivElement>, content: string, typesetMath: boolean) => {
      if (!ref.current) return;
      if (typeof marked !== 'undefined') {
        ref.current.innerHTML = marked.parse(content);
        if (typesetMath && window.MathJax) {
          window.MathJax.typesetPromise([ref.current]).catch((err: any) => console.error('MathJax typesetting failed:', err));
        }
      } else {
        const p = document.createElement('p');
        p.className = 'whitespace-pre-wrap';
        p.textContent = content;
        ref.current.innerHTML = '';
        ref.current.appendChild(p);
      }
    };

    if (mode === 'rewriter' && 'rewrittenContent' in output) {
      renderMarkdown(contentRef, (output as RewriterOutput).rewrittenContent, false);
    } else if (mode === 'mathFormatter' && 'formattedContent' in output) {
      renderMarkdown(contentRef, (output as MathFormatterOutput).formattedContent, true);
    } else if (mode === 'technical' && 'finalSummary' in output) {
        const techOutput = output as SummaryOutput;
        const isMarkdownSummary = ['sessionHandoff', 'readme', 'solutionFinder', 'timeline', 'decisionMatrix', 'pitchGenerator', 'causeEffectChain', 'swotAnalysis', 'checklist', 'dialogCondensation', 'graphTreeOutline', 'entityRelationshipDigest', 'rulesDistiller', 'metricsDashboard', 'qaPairs', 'processFlow', 'raciSnapshot', 'riskRegister', 'milestoneTracker', 'glossaryTermMap', 'hierarchyOfNeeds', 'stakeholderMap', 'constraintList', 'prosConsTable'].includes(techOutput.summaryFormat ?? 'default');
        if (isMarkdownSummary) {
            renderMarkdown(summaryContentRef, techOutput.finalSummary, false);
        }
    }
  }, [output, mode]);
  
  // Effect specifically for Mermaid.js rendering and interactivity
  useEffect(() => {
    // Cleanup previous pan/zoom instance if it exists
    if (panZoomInstanceRef.current) {
        if(panZoomInstanceRef.current.customResizeHandler) {
            window.removeEventListener('resize', panZoomInstanceRef.current.customResizeHandler);
        }
        panZoomInstanceRef.current.destroy();
        panZoomInstanceRef.current = null;
    }

    if (mode === 'technical' && 'mermaidDiagram' in output && (output as SummaryOutput).mermaidDiagram) {
      const techOutput = output as SummaryOutput;
      if (techOutput.mermaidDiagram && mermaidContainerRef.current) {
        try {
          if (typeof mermaid !== 'undefined') {
              const uniqueId = `mermaid-graph-${Date.now()}`;
              mermaid.render(uniqueId, techOutput.mermaidDiagram, (svgCode) => {
                if (mermaidContainerRef.current) {
                    mermaidContainerRef.current.innerHTML = svgCode;
                    const svgElement = mermaidContainerRef.current.querySelector('svg');
                    // Initialize pan-zoom on the newly rendered SVG
                    if (svgElement && typeof svgPanZoom !== 'undefined') {
                        // Ensure SVG scales within the container
                        svgElement.style.width = '100%';
                        svgElement.style.height = '100%';
                        
                        panZoomInstanceRef.current = svgPanZoom(svgElement, {
                            panEnabled: true,
                            controlIconsEnabled: true,
                            zoomEnabled: true,
                            dblClickZoomEnabled: true,
                            mouseWheelZoomEnabled: true,
                            preventMouseEventsDefault: true,
                            zoomScaleSensitivity: 0.2,
                            minZoom: 0.2,
                            maxZoom: 20,
                            fit: true,
                            center: true,
                            contain: true,
                        });

                        // Force a resize and center after initialization to fix initial view
                        panZoomInstanceRef.current.resize();
                        panZoomInstanceRef.current.center();

                        const resizeHandler = () => {
                            panZoomInstanceRef.current?.resize();
                            panZoomInstanceRef.current?.fit();
                            panZoomInstanceRef.current?.center();
                        };
                        window.addEventListener('resize', resizeHandler);
                        // Store handler on instance for later removal
                        panZoomInstanceRef.current.customResizeHandler = resizeHandler;
                    }
                }
              });
          }
        } catch (e) {
          console.error("Mermaid.js rendering failed:", e);
          if (mermaidContainerRef.current) {
            mermaidContainerRef.current.innerHTML = `<p class="text-red-400">Error rendering diagram. See console for details.</p><pre>${techOutput.mermaidDiagram.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
          }
        }
      }
    } else if (mermaidContainerRef.current) {
        mermaidContainerRef.current.innerHTML = '';
    }
    
    // Return a cleanup function for the effect
    return () => {
         if (panZoomInstanceRef.current) {
            if(panZoomInstanceRef.current.customResizeHandler) {
                window.removeEventListener('resize', panZoomInstanceRef.current.customResizeHandler);
            }
            panZoomInstanceRef.current.destroy();
            panZoomInstanceRef.current = null;
        }
    };
  }, [output, mode]);


  if (mode === 'technical' && 'finalSummary' in output) {
    const techOutput = output as SummaryOutput;
    const isMarkdownSummary = ['sessionHandoff', 'readme', 'solutionFinder', 'timeline', 'decisionMatrix', 'pitchGenerator', 'causeEffectChain', 'swotAnalysis', 'checklist', 'dialogCondensation', 'graphTreeOutline', 'entityRelationshipDigest', 'rulesDistiller', 'metricsDashboard', 'qaPairs', 'processFlow', 'raciSnapshot', 'riskRegister', 'milestoneTracker', 'glossaryTermMap', 'hierarchyOfNeeds', 'stakeholderMap', 'constraintList', 'prosConsTable'].includes(techOutput.summaryFormat ?? 'default');
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
              onClick={() => copyToClipboard(techOutput.finalSummary, isMarkdownSummary ? "Summary Markdown" : "Summary")}
              className="text-xs px-3 py-1 bg-sky-700 text-sky-100 rounded hover:bg-sky-600 transition-colors"
              aria-label="Copy summary to clipboard"
            >
              {isMarkdownSummary ? "Copy Markdown" : "Copy Summary"}
            </button>
          </div>
          {isMarkdownSummary ? (
             <div 
                className="p-4 bg-slate-800 rounded-lg max-h-96 overflow-y-auto shadow-inner prose prose-sm prose-invert max-w-none" 
                ref={summaryContentRef}
              >
                {/* Content is rendered here by the useEffect hook */}
              </div>
          ) : (
             <div className="p-4 bg-slate-800 rounded-lg max-h-96 overflow-y-auto shadow-inner">
                {techOutput.finalSummary && techOutput.finalSummary.trim() !== '' ? (
                  <p className="text-text-primary whitespace-pre-wrap text-sm leading-relaxed">{techOutput.finalSummary}</p>
                ) : (
                  <p className="text-text-secondary italic">No summary could be generated.</p>
                )}
             </div>
          )}
        </div>

        {techOutput.mermaidDiagram && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-semibold text-text-primary">Entity-Relationship Diagram</h2>
              <button 
                onClick={() => copyToClipboard(techOutput.mermaidDiagram!, "Mermaid Diagram Code")}
                className="text-xs px-3 py-1 bg-sky-700 text-sky-100 rounded hover:bg-sky-600 transition-colors"
                aria-label="Copy Mermaid diagram code to clipboard"
              >
                Copy Diagram Code
              </button>
            </div>
            <div className="p-4 bg-slate-800 rounded-lg min-h-[24rem] h-[50vh] overflow-hidden shadow-inner flex justify-center items-center">
              <div ref={mermaidContainerRef} className="w-full h-full cursor-move">
                {/* Mermaid SVG is rendered here by the useEffect hook */}
              </div>
            </div>
          </div>
        )}

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
  } else if (mode === 'styleExtractor' && 'styleDescription' in output) {
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
  } else if ((mode === 'rewriter' && 'rewrittenContent' in output) || (mode === 'mathFormatter' && 'formattedContent' in output)) {
    const renderOutput = output as (RewriterOutput | MathFormatterOutput);
    const content = 'rewrittenContent' in renderOutput ? renderOutput.rewrittenContent : renderOutput.formattedContent;
    const title = mode === 'rewriter' ? 'Generated Narrative' : 'Formatted Document';
    const copyType = mode === 'rewriter' ? 'Narrative Markdown' : 'Formatted Markdown';
    
    return (
      <div className="space-y-8">
        {renderOutput.processingTimeSeconds !== undefined && (
          <div className="text-center text-sm text-text-secondary">
            Processing completed in {renderOutput.processingTimeSeconds} seconds.
          </div>
        )}
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
            <button 
              onClick={() => copyToClipboard(content, copyType)}
              className="text-xs px-3 py-1 bg-sky-700 text-sky-100 rounded hover:bg-sky-600 transition-colors"
              aria-label={`Copy ${copyType} to clipboard`}
            >
              Copy Markdown
            </button>
          </div>
          <div 
            className="p-4 bg-slate-800 rounded-lg max-h-[32rem] overflow-y-auto shadow-inner prose prose-sm prose-invert max-w-none" 
            ref={contentRef}
          >
            {/* Content is rendered here by the useEffect hook */}
          </div>
        </div>
      </div>
    );
  }
  return null; // Should not happen if props are correct
};