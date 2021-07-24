export class LastOpenedDocStorage {
  saveLastOpenedDoc(docId: string | undefined) {
    localStorage.setItem("last-opened-doc", docId);
  }

  getLastOpenedDoc(): string | undefined {
    return localStorage.getItem("last-opened-doc") ?? undefined;
  }

  static instance = new LastOpenedDocStorage();
}
