
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// This is a placeholder for process.env. In a real build system (Vite, Webpack),
// you would configure this. For demonstration, we'll set it if not present.
if (typeof process === 'undefined') {
  // @ts-ignore
  window.process = { env: {} };
}
if (!process.env.API_KEY) {
  // IMPORTANT: Replace this with your actual API key or use environment variables.
  // For safety, it's best to manage API keys outside of version control.
  // This is only a placeholder for the application to run in a sandboxed environment.
  // process.env.API_KEY = "YOUR_GEMINI_API_KEY"; 
  console.warn("API_KEY environment variable is not set. Gemini API calls will fail.");
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
