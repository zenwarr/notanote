import { FileSettings } from "@common/Settings";


function numberValueToPropValue(value: number | undefined): string | null {
  return value == null ? null : `${ value }px`;
}

function sizeValueToPropValue(value: number | string | undefined): string | null {
  if (typeof value === "string") {
    return value;
  } else {
    return numberValueToPropValue(value);
  }
}

export function setEditorVars(el: HTMLElement, settings: FileSettings, isDarkTheme: boolean) {
  el.style.setProperty("--editor-text-indent", numberValueToPropValue(settings.textIndent));
  el.style.setProperty("--editor-line-height", settings.lineHeight == null ? null : "" + settings.lineHeight);
  el.style.setProperty("--editor-paragraph-spacing", numberValueToPropValue(settings.paragraphSpacing));
  el.style.setProperty("--editor-hyphens", settings.hyphens ?? null);
  el.style.setProperty("--editor-font-size", sizeValueToPropValue(settings.fontSize));
  el.style.setProperty("--editor-font-family", settings.fontFamily ?? null);
  el.style.setProperty("--editor-caret-color", isDarkTheme ? "lightgray" : "black");
  el.style.setProperty("--editor-whitespace-color", isDarkTheme ? "gray" : "#b5b5b5");
  el.style.setProperty("--editor-selection-color", isDarkTheme ? "#464646" : "#d7d4f0");
  el.style.setProperty("--editor-cursor-color", isDarkTheme ? "white" : "black");
  el.style.setProperty("--editor-code-background-color", isDarkTheme ? "#1d1f21" : "#e1e1e1");
  el.style.setProperty("--editor-active-line-background", isDarkTheme ? "#68686855" : "#e1e1e166");
  el.style.setProperty("--editor-max-width", sizeValueToPropValue(settings.maxWidth));

  document.documentElement.lang = settings.lang || "en";
}
