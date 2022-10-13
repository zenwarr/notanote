import * as json5 from "json5";


export function tryParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}


export function tryParseJson5(text: string) {
  try {
    return json5.parse(text);
  } catch (e) {
    return null;
  }
}
