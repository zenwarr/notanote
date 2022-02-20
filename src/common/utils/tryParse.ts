export function tryParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}
