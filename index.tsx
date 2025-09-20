
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

declare var marked: any;
declare var hljs: any;

// Configure marked to use highlight.js for syntax highlighting
if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
  marked.setOptions({
    highlight: function(code: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
    langPrefix: 'hljs language-',
    breaks: true,
    gfm: true,
  });
}

// This is a placeholder for process.env. In a real build system (Vite, Webpack),
// you would configure this. For demonstration, we'll set it if not present.
if (typeof process === 'undefined') {
  // @ts-ignore
  window.process = { env: {} };
}
if (!process.env.API_KEY) {
  // IMPORTANT: Replace this with your default API key or manage credentials at runtime via the AI Settings dialog.
  // For safety, it's best to manage API keys outside of version control.
  // This is only a placeholder for the application to run in a sandboxed environment.
  // process.env.API_KEY = "YOUR_DEFAULT_AI_API_KEY";
  console.warn("API_KEY environment variable is not set. Configure provider keys from the AI Settings dialog before using AI features.");
}


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);