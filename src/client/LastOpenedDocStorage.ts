export class LastOpenedDocStorage {
  saveLastOpenedDoc(docId: string | undefined) {
    if (docId) {
      localStorage.setItem("last-opened-doc", docId);
    } else {
      localStorage.removeItem("last-opened-doc");
    }
  }


  getLastOpenedDoc(): string | undefined {
    return localStorage.getItem("last-opened-doc") ?? undefined;
  }


  static instance = new LastOpenedDocStorage();
}
