const RECENT_KEY = "recent-docs";
const MAX_RECENT_DOCS = 10;


export class RecentDocStorage {
  saveLastOpenedDoc(docId: string) {
    let recentDocs = this.getRecentDocs();
    recentDocs = [ docId, ...recentDocs.filter(x => x !== docId) ];
    if (recentDocs.length > MAX_RECENT_DOCS) {
      recentDocs = recentDocs.slice(0, MAX_RECENT_DOCS);
    }

    localStorage.setItem(RECENT_KEY, JSON.stringify(recentDocs));
  }


  getRecentDocs(): string[] {
    const recents = localStorage.getItem(RECENT_KEY);
    if (typeof recents === "string") {
      try {
        const items = JSON.parse(recents);
        if (Array.isArray(items) && items.every(x => typeof x === "string")) {
          return items;
        } else {
          return [];
        }
      } catch (err) {
        return [];
      }
    } else {
      return [];
    }
  }


  getLastOpenedDoc(): string | undefined {
    return this.getRecentDocs()[0];
  }


  static instance = new RecentDocStorage();
}
