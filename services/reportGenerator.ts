
import type { ProcessedOutput, Mode, SummaryOutput, StyleModelOutput, RewriterOutput, MathFormatterOutput } from '../types';

declare var marked: any;
declare var hljs: any;

// Configure marked to use highlight.js
if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
  marked.setOptions({
    highlight: function(code: string, lang: string) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-', // for CSS classes
    breaks: true, // render <br> for single newlines
    gfm: true, // use GitHub Flavored Markdown
  });
}

const formatDate = (date: Date) => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
};

const generateHtmlReport = (output: ProcessedOutput, mode: Mode, styleTarget?: string, suggestions?: string[] | null): string => {
  const generationDate = formatDate(new Date());
  const isTechnical = mode === 'technical' && 'finalSummary' in output;
  const isStyle = mode === 'styleExtractor' && 'styleDescription' in output;
  const isRewriter = mode === 'rewriter' && 'rewrittenContent' in output;
  const isFormatter = mode === 'mathFormatter' && 'formattedContent' in output;

  const techOutput = isTechnical ? output as SummaryOutput : null;
  const styleOutput = isStyle ? output as StyleModelOutput : null;
  const rewriterOutput = isRewriter ? output as RewriterOutput : null;
  const formatterOutput = isFormatter ? output as MathFormatterOutput : null;

  const title = isTechnical 
    ? 'Technical Summary Report' 
    : isStyle 
    ? `Writing Style Analysis Report${styleTarget ? ` for "${styleTarget}"` : ''}`
    : isRewriter
    ? 'Rewritten Narrative Report'
    : 'Formatted Document Report';
  
  const parseMarkdown = (text: string): string => {
      try {
          if (typeof marked !== 'undefined') {
              return marked.parse(text);
          }
          // Fallback if marked is not available
          return `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>')}</p>`;
      } catch (e) {
          console.error("Markdown parsing failed:", e);
          return `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>')}</p>`;
      }
  };

  const bodyContent = `
    ${isTechnical && techOutput ? `
      <div class="section">
        <h2>Generated Summary</h2>
        <div class="content-box">
          ${parseMarkdown(techOutput.finalSummary)}
        </div>
      </div>
      ${techOutput.highlights && techOutput.highlights.length > 0 ? `
      <div class="section">
        <h2>Key Highlights</h2>
        <ul class="highlight-list">
          ${techOutput.highlights.map(h => `<li>${h.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    ` : ''}

    ${isStyle && styleOutput ? `
      <div class="section">
        <h2>Extracted Style Model</h2>
        <div class="content-box">
          ${parseMarkdown(styleOutput.styleDescription)}
        </div>
      </div>
    ` : ''}
    
    ${isRewriter && rewriterOutput ? `
      <div class="section">
        <h2>Generated Narrative</h2>
        <div class="content-box">
          ${parseMarkdown(rewriterOutput.rewrittenContent)}
        </div>
      </div>
    ` : ''}

    ${isFormatter && formatterOutput ? `
      <div class="section">
        <h2>Formatted Document</h2>
        <div class="content-box">
          ${parseMarkdown(formatterOutput.formattedContent)}
        </div>
      </div>
    ` : ''}

    ${suggestions && suggestions.length > 0 ? `
      <div class="section">
        <h2>Next Steps & Suggestions</h2>
        <div class="content-box">
          ${parseMarkdown(suggestions.map(s => `* ${s}`).join('\n'))}
        </div>
      </div>
    ` : ''}
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']]
      },
      svg: {
        fontCache: 'global'
      }
    };
  </script>
  <script type="text/javascript" id="MathJax-script" async
    src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js">
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      background-color: #0f172a;
      color: #f1f5f9;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 800px;
      margin: 40px auto;
      padding: 20px 40px;
      background-color: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .header {
      border-bottom: 1px solid #334155;
      padding-bottom: 20px;
      margin-bottom: 30px;
      text-align: center;
    }
    h1 {
      color: #ffffff;
      font-size: 2.25rem;
      font-weight: 700;
      margin: 0;
    }
    .meta-info {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-top: 8px;
    }
    .section {
      margin-bottom: 30px;
    }
    h2 {
      color: #f1f5f9;
      font-size: 1.5rem;
      font-weight: 600;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 8px;
      margin-bottom: 20px;
    }
    .content-box {
      background-color: #0f172a;
      padding: 20px;
      border-radius: 6px;
      border: 1px solid #334155;
      font-size: 0.95rem;
    }
    .content-box p, .content-box li {
      margin-top: 0;
      margin-bottom: 1rem;
    }
    .content-box p:last-child, .content-box ul:last-child, .content-box ol:last-child {
        margin-bottom: 0;
    }
    .content-box ul {
        padding-left: 20px;
    }
    .content-box ul li::marker {
      color: #0284c7;
    }
    .content-box code {
        background-color: #334155;
        padding: 0.2em 0.4em;
        margin: 0;
        font-size: 85%;
        border-radius: 3px;
    }
    .content-box pre {
        background-color: #0d1117; /* Matches atom-one-dark better */
        padding: 1em;
        border-radius: 6px;
        overflow-x: auto;
    }
    .content-box pre code {
        background-color: transparent;
        padding: 0;
    }
    .highlight-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 12px;
    }
    .highlight-list li {
      background-color: #334155;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #0284c7;
      font-size: 0.95rem;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
      border-top: 1px solid #334155;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p class="meta-info">Generated on: ${generationDate}</p>
    </div>
    ${bodyContent}
    <div class="footer">
      <p>Powered by AI Content Suite & Gemini</p>
    </div>
  </div>
</body>
</html>
  `;
};

const generateMarkdownReport = (output: ProcessedOutput, mode: Mode, styleTarget?: string, suggestions?: string[] | null): string => {
  const generationDate = formatDate(new Date());
  const isTechnical = mode === 'technical' && 'finalSummary' in output;
  const isStyle = mode === 'styleExtractor' && 'styleDescription' in output;
  const isRewriter = mode === 'rewriter' && 'rewrittenContent' in output;
  const isFormatter = mode === 'mathFormatter' && 'formattedContent' in output;

  const techOutput = isTechnical ? output as SummaryOutput : null;
  const styleOutput = isStyle ? output as StyleModelOutput : null;
  const rewriterOutput = isRewriter ? output as RewriterOutput : null;
  const formatterOutput = isFormatter ? output as MathFormatterOutput : null;

  const title = isTechnical 
    ? 'Technical Summary Report' 
    : isStyle 
    ? `Writing Style Analysis Report${styleTarget ? ` for "${styleTarget}"` : ''}`
    : isRewriter
    ? 'Rewritten Narrative Report'
    : 'Formatted Document Report';

  let content = ``;
  content += `# ${title}\n\n`;
  content += `**Generated on:** ${generationDate}\n\n`;
  content += `---\n\n`;

  if (isTechnical && techOutput) {
    content += `## Generated Summary\n\n`;
    content += `${techOutput.finalSummary}\n\n`;
    if (techOutput.highlights && techOutput.highlights.length > 0) {
      content += `## Key Highlights\n\n`;
      content += techOutput.highlights.map(h => `* ${h.text}`).join('\n');
      content += `\n\n`;
    }
  }

  if (isStyle && styleOutput) {
    content += `## Extracted Style Model\n\n`;
    content += `${styleOutput.styleDescription}\n\n`;
  }
  
  if (isRewriter && rewriterOutput) {
    content += `## Generated Narrative\n\n`;
    content += `${rewriterOutput.rewrittenContent}\n\n`;
  }

  if (isFormatter && formatterOutput) {
    content += `## Formatted Document\n\n`;
    content += `${formatterOutput.formattedContent}\n\n`;
  }
  
  if (suggestions && suggestions.length > 0) {
    content += `## Next Steps & Suggestions\n\n`;
    content += suggestions.map(s => `* ${s}`).join('\n');
    content += `\n\n`;
  }

  content += `---\n\n`;
  content += `*Powered by AI Content Suite & Gemini*\n`;

  return content;
};


export const generateReport = (format: 'html' | 'md', output: ProcessedOutput, mode: Mode, styleTarget?: string, suggestions?: string[] | null): string => {
  switch (format) {
    case 'html':
      return generateHtmlReport(output, mode, styleTarget, suggestions);
    case 'md':
      return generateMarkdownReport(output, mode, styleTarget, suggestions);
    default:
      return "Unsupported format";
  }
};
