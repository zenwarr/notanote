import { FileSettings } from "@common/Settings";
import { useEffect } from "react";
import * as nanoid from "nanoid";


function getFontTag(url: string) {
  const links = document.head.getElementsByTagName("link");
  for (let i = 0; i < links.length; i++) {
    if (links[i].href === url) {
      return links[i];
    }
  }

  return undefined;
}


export function useGlobalEntrySettings(settings: FileSettings) {
  useEffect(() => {
    const remoteFonts = settings.remoteFonts;
    const createdIds: string[] = [];

    for (const font of remoteFonts || []) {
      const existingTag = getFontTag(font);
      if (!existingTag) {
        const id = nanoid.nanoid();

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = font;
        link.id = id;
        document.head.appendChild(link);

        createdIds.push(id);
      }
    }

    return () => {
      for (const id of createdIds) {
        const tag = document.getElementById(id);
        if (tag) {
          tag.remove();
        }
      }
    };
  }, [ settings ]);
}
