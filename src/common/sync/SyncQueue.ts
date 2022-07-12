import { StoragePath } from "../storage/StoragePath";


export class SyncQueue {
  add(location: StoragePath) {
    if (this._queue.some(item => location.inside(item))) {
      return;
    }

    this._queue.push(location);
  }


  remove(location: StoragePath) {
    this._queue = this._queue.filter(path => !path.isEqual(location));
  }


  private _queue: StoragePath[] = [];
}
