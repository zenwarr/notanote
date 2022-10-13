export function getLanguageFromFileName(filename: string) {
  const ext = filename.split(".").pop();
  if (ext === "ts" || ext === "tsx") {
    return "typescript";
  } else if (ext === "js" || ext === "jsx") {
    return "javascript";
  } else if (ext === "json") {
    return "json";
  } else {
    return "plaintext";
  }
}
