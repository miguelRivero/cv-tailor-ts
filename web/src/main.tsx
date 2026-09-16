import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import './index.css';
import App from './App.tsx';

// shadcn's generated CSS uses a class-based dark variant
// (`@custom-variant dark (&:is(.dark *))`), so dark mode only ever
// activates when something adds a literal `.dark` class - it will
// never react to prefers-color-scheme on its own. ThemeProvider is
// what actually applies that class, defaulting to the OS preference
// and persisting the user's own choice once there's a control to
// change it.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>
);
