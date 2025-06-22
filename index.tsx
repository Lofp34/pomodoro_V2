import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { WORK_DURATION_MINUTES } from './constants'; // Example import, not strictly needed here but good practice

// This ensures process.env.API_KEY can be accessed.
// In a Vite/Create React App setup, env vars prefixed with VITE_ or REACT_APP_ are embedded.
// For this environment, we assume process.env is populated externally.
// If process.env.API_KEY is not set, GeminiService will handle it gracefully.
if (typeof process === 'undefined') {
  // @ts-ignore
  window.process = { env: {} }; // Basic polyfill for browser if process is not defined
} else if (typeof process.env === 'undefined') {
  // @ts-ignore
  process.env = {};
}
// You would set process.env.API_KEY in your deployment environment or .env file (not committed)
// For example: process.env.API_KEY = "YOUR_GEMINI_API_KEY"; (This line is for illustration, don't hardcode keys)


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
