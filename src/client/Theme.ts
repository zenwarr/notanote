import { createTheme, useTheme } from "@material-ui/core";
import { useMemo, useState } from "react";


function isSystemThemeDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}


export function useThemeController() {
  const [ isDark, setIsDark ] = useState(isSystemThemeDark);

  const theme = useMemo(() => createTheme(
      {
        palette: {
          type: isDark ? "dark" : "light"
        },
        overrides: {
          MuiCssBaseline: {
            "@global": {
              html: {
                colorScheme: isDark ? "dark" : "auto"
              }
            }
          }
        }
      }
  ), [ isDark ]);

  return {
    theme: theme,
    isDark,
    setIsDark
  };
}


export function useCurrentThemeIsDark() {
  const theme = useTheme();
  return theme.palette.type === "dark";
}
