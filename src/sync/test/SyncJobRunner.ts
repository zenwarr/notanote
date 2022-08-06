import * as mobx from "mobx";
import { StoragePath } from "@storage/StoragePath";
import { LocalSyncWorker, SyncJob } from "@sync/LocalSyncWorker";


const MAX_PARALLEL_JOBS = 3;


export interface SyncJobRunnerError {
  path: StoragePath;
  error: Error;
  date: Date;
}


export type TaskQueue = (cb: () => Promise<void>) => Promise<void>;


const backgroundTaskQueue: TaskQueue = async cb => { setTimeout(cb, 0) };


export class SyncJobRunner {
  constructor(worker: LocalSyncWorker, taskQueue: TaskQueue = backgroundTaskQueue) {
    this.worker = worker;
    this.taskQueue = taskQueue;
    mobx.makeObservable(this, {
      runningJobs: mobx.observable
    });
  }


  async run(): Promise<void> {
    const jobCount = Math.max(MAX_PARALLEL_JOBS - this.runningJobs.length, 0);
    const jobs = await this.worker.getJobs(jobCount, jobPath => !this.lockedPaths.has(jobPath.normalized));
    for (const job of jobs) {
      await this.taskQueue(() => this.runJob(job));
    }

    if (jobs.length === 0 && this.runningJobs.length === 0) {
      this._isWorking = false;
    } else {
      this._isWorking = true;
    }
  }


  isWorking() {
    return this._isWorking;
  }


  private async runJob(job: SyncJob) {
    try {
      this.runningJobs.push(job);
      this.lockedPaths.add(job.path.normalized);
      await this.worker.doJob(job);
      this.lastSuccessfulJobDone = new Date();
      this.errors = this.errors.filter(e => !e.path.isEqual(job.path));
    } catch (error) {
      this.errors = this.errors.filter(e => !e.path.isEqual(job.path));
      this.errors.push({
        path: job.path,
        error: error as Error,
        date: new Date()
      });
    }

    this.runningJobs = this.runningJobs.filter(j => !j.path.isEqual(job.path));
    this.lockedPaths.delete(job.path.normalized);
    await this.run();
  }


  runningJobs: SyncJob[] = [];
  errors: SyncJobRunnerError[] = [];
  lastSuccessfulJobDone: Date | undefined = undefined;

  private readonly lockedPaths = new Set<string>();
  private readonly worker: LocalSyncWorker;
  private readonly taskQueue: TaskQueue;
  private _isWorking = false;
}
