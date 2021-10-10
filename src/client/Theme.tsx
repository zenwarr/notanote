import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";


function isSystemThemeDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}


function useMeta(name: string, value: string | undefined) {
  useEffect(() => {
    const nodes = document.head.querySelectorAll(`meta[name=${ name }]`);
    nodes.forEach(node => node.remove());

    if (value != null) {
      const node = document.createElement("meta");
      node.setAttribute("name", name);
      node.setAttribute("content", value);
      document.head.appendChild(node);
    }
  }, [ name, value ]);
}


export interface AppThemeCtxData {
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}


export const AppThemeContext = React.createContext<AppThemeCtxData | undefined>(undefined);

export function useAppThemeContext() {
  const ctx = React.useContext(AppThemeContext);
  if (!ctx) {
    throw new Error("Expected to be inside AppThemeContext");
  }

  return ctx;
}


export function useThemeController() {
  const [ isDark, setIsDark ] = useState(isSystemThemeDark);

  useMeta("theme-color", isDark ? "#303030" : "#fafafa");

  const theme = useMemo(() => createTheme(
      {
        palette: {
          mode: isDark ? "dark" : "light"
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              html: {
                colorScheme: isDark ? "dark" : "auto"
              }
            }
          }
        }
      }
  ), [ isDark ]);

  return {
    theme,
    isDark,
    setIsDark
  };
}


export function useCurrentThemeIsDark() {
  const appTheme = useAppThemeContext();
  return appTheme.isDark;
}


export function AppThemeProvider(props: React.PropsWithChildren<{}>) {
  const theme = useThemeController();

  return <ThemeProvider theme={ theme.theme }>
    <CssBaseline/>
    <AppThemeContext.Provider value={ { isDark: theme.isDark, setIsDark: theme.setIsDark } }>
      { props.children }
    </AppThemeContext.Provider>
  </ThemeProvider>;
}
