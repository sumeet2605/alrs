// src/main.tsx
import React, { useState, createContext, useMemo } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ConfigProvider, theme as antdTheme, App as AntdApp } from "antd";
import "antd/dist/reset.css";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";

type ThemeContextType = { darkMode: boolean; toggleTheme: () => void; };
export const ThemeContext = createContext<ThemeContextType>({ darkMode: false, toggleTheme: () => {} });

function RootApp() {
  const [darkMode, setDarkMode] = useState(false);
  const toggleTheme = () => setDarkMode(p => !p);
  const contextValue = useMemo(() => ({ darkMode, toggleTheme }), [darkMode]);

  const muiTheme = useMemo(() => createTheme({
    palette: { mode: darkMode ? "dark" : "light", primary: { main: "#722ed1" } },
    typography: { fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" }
  }), [darkMode]);

  const antdThemeConfig = useMemo(() => ({
    token: { colorPrimary: "#722ed1", borderRadius: 8, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" },
    algorithm: darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  }), [darkMode]);
  // console.log(import.meta.env.VITE_API_BASE);
  return (
    <ThemeContext.Provider value={contextValue}>
      <ConfigProvider theme={antdThemeConfig}>
        <AntdApp>
          <MuiThemeProvider theme={muiTheme}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </MuiThemeProvider>
        </AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><RootApp /></React.StrictMode>
);
