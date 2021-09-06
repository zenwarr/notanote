import { createTheme, useTheme } from "@material-ui/core";
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


export function useThemeController() {
  const [ isDark, setIsDark ] = useState(isSystemThemeDark);

  useMeta("theme-color", isDark ? "#303030" : "#fafafa");

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
