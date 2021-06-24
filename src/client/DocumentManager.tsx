import { Document, SaveState } from "./Document";
import ky from "ky";
import * as luxon from "luxon";
import { FileInfo } from "../common/WorkspaceEntry";
import { makeObservable, observable } from "mobx";


const AUTO_SAVE_INTERVAL = luxon.Duration.fromObject({ second: 30 });


export class DocumentManager {
  readonly documents = new Map<string, { doc: Document, usageCount: number }>();


  public constructor() {
    this.startSaveLoop();
    makeObservable(this, {
      documents: observable
    });
  }


  public async create(fileID: string): Promise<Document> {
    const docInfo = this.documents.get(fileID);
    if (docInfo) {
      docInfo.usageCount += 1;
      return docInfo.doc;
    }

    const fileInfo = await ky(`/api/workspaces/default/files/${ encodeURIComponent(fileID) }`).json<FileInfo>();
    let document = new Document(fileInfo.content);
    this.documents.set(fileID, { doc: document, usageCount: 1 });
    return document;
  }


  public close(fileID: string) {
    const doc = this.documents.get(fileID);
    if (doc) {
      doc.usageCount -= 1;
    }
  }


  private startSaveLoop() {
    const step = async () => {
      await this.saveWorkspaceInfallible();
      setTimeout(step, AUTO_SAVE_INTERVAL.as("millisecond"));
    };

    setTimeout(step, AUTO_SAVE_INTERVAL.as("millisecond"));
  }


  private async saveWorkspaceInfallible() {
    try {
      await this.saveWorkspace();
    } catch (error) {
      alert("Failed to save workspace: " + error.message);
    }
  }


  private async saveWorkspace() {
    if (this.saveLoopRunning) {
      return;
    }

    this.saveLoopRunning = true;

    try {
      const saveJobs: { fileId: string, doc: Document }[] = [];
      for (const [ fileId, docInfo ] of this.documents.entries()) {
        if (docInfo.doc.saveState === SaveState.UnsavedChanges) {
          saveJobs.push({ doc: docInfo.doc, fileId });
        }
      }

      await Promise.all(saveJobs.map(job => this.saveDocInfallible(job.fileId, job.doc)));

      for (const [ docId, docInfo ] of this.documents.entries()) {
        if (docInfo.usageCount === 0 && docInfo.doc.saveState === SaveState.NoChanges) {
          this.documents.delete(docId);
        }
      }
    } finally {
      this.saveLoopRunning = false;
    }
  }


  private async saveDocInfallible(fileId: string, doc: Document) {
    doc.saveState = SaveState.Saving;

    try {
      await ky.put(`/api/workspaces/default/files/${ encodeURIComponent(fileId) }`, {
        json: {
          content: doc.getContents()
        }
      }).json<FileInfo>();
      doc.onSaveCompleted(undefined);
    } catch (err) {
      alert("Failed to save document: " + err.message);
      doc.onSaveCompleted(err.message);
    }
  }


  public static instance = new DocumentManager();
  private saveLoopRunning = false;
}
