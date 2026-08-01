import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const themes = {
  light: {
    name: "Light",
    primary: "#007bff",
    secondary: "#6c757d",
    background: "#ffffff",
    text: "#212529",
    cardBg: "#f8f9fa",
    border: "#dee2e6",
    error: "#dc3545",
  },
  dark: {
    name: "Dark",
    primary: "#0d6efd",
    secondary: "#6c757d",
    background: "#212529",
    text: "#f8f9fa",
    cardBg: "#343a40",
    border: "#495057",
    error: "#dc3545",
  },
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) return savedTheme;
    } catch (e) {}
    // Fallback to system preference
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    try {
      localStorage.setItem("theme", currentTheme);
    } catch (e) {
      // ignore
    }

    // Toggle .dark class for Tailwind / CSS variables
    if (typeof document !== 'undefined') {
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Also keep CSS custom properties for components that rely on them
      document.documentElement.style.setProperty('--primary-color', themes[currentTheme].primary);
      document.documentElement.style.setProperty('--secondary-color', themes[currentTheme].secondary);
      document.documentElement.style.setProperty('--background-color', themes[currentTheme].background);
      document.documentElement.style.setProperty('--text-color', themes[currentTheme].text);
      document.documentElement.style.setProperty('--card-bg', themes[currentTheme].cardBg);
      document.documentElement.style.setProperty('--border-color', themes[currentTheme].border);
      document.documentElement.style.setProperty('--error-color', themes[currentTheme].error);
    }
  }, [currentTheme]);

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
