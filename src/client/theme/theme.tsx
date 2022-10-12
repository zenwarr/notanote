import { createTheme, CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import * as React from "react";
import * as mobx from "mobx-react-lite";
import { useMemo, useState } from "react";
import { Workspace } from "../workspace/workspace";
import { ThemeConfig } from "./theme-config";
import { useMeta } from "./useMeta";


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


function createPaletteFromThemeConfig(themeConfig: ThemeConfig | undefined) {
  return themeConfig || {};
}


export function useThemeController() {
  const [ darkModeOverride, setDarkModeOverride ] = useState<boolean | undefined>();
  const systemDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const isDark = darkModeOverride ?? systemDarkMode;

  const theme = useMemo(() => createTheme(
      {
        palette: {
          mode: isDark ? "dark" : "light",
          ...(Workspace.instanceInited ? createPaletteFromThemeConfig(Workspace.instance.themeConfig) : undefined)
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
  ), [ isDark, Workspace.instanceInited ? Workspace.instance.themeConfig : undefined ]);

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


export const AppThemeProvider = mobx.observer((props: React.PropsWithChildren<{}>) => {
  const theme = useThemeController();

  return <ThemeProvider theme={ theme.theme }>
    <CssBaseline/>
    <AppThemeContext.Provider value={ { isDark: theme.isDark, setIsDark: theme.setIsDark } }>
      { props.children }
    </AppThemeContext.Provider>
  </ThemeProvider>;
});
