import { createTheme, CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";


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
  const [ darkModeOverride, setDarkModeOverride ] = useState<boolean | undefined>();
  const systemDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const isDark = darkModeOverride ?? systemDarkMode;

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

  useMeta("theme-color", theme.palette.background.default);

  return {
    theme,
    isDark,
    setIsDark: (mode: boolean) => setDarkModeOverride(mode)
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
