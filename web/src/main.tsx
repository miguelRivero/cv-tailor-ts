import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import './index.css';
import App from './App.tsx';

// Product identity is morning-sky light. Force light so a leftover
// next-themes "dark" value from the previous studio pass cannot stick.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <App />
    </ThemeProvider>
  </StrictMode>
);
