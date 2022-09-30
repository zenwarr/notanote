import * as mobx from "mobx";
import { StoragePath } from "@storage/StoragePath";
import { SyncJob } from "@sync/Sync";


const MAX_PARALLEL_JOBS = 3;


export interface SyncJobRunnerError {
  path: StoragePath;
  error: Error;
  date: Date;
}


export type TaskQueue = (cb: () => Promise<void>) => Promise<void>;


const backgroundTaskQueue: TaskQueue = async cb => { setTimeout(cb, 0) };


export interface SyncJobSource {
  getJobs(count: number, filter?: (path: StoragePath) => boolean): Promise<SyncJob[]>;
  doJob(job: SyncJob): Promise<void>;
}


export class SyncJobRunner {
  constructor(source: SyncJobSource, taskQueue: TaskQueue = backgroundTaskQueue) {
    this.syncSource = source;
    this.taskQueue = taskQueue;
    mobx.makeObservable(this, {
      runningJobs: mobx.observable
    });
  }


  async run(): Promise<void> {
    const jobCount = Math.max(MAX_PARALLEL_JOBS - this.runningJobs.length, 0);
    const jobs = await this.syncSource.getJobs(jobCount, jobPath => !this.lockedPaths.has(jobPath.normalized));
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
      await this.syncSource.doJob(job);
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
  private readonly syncSource: SyncJobSource;
  private readonly taskQueue: TaskQueue;
  private _isWorking = false;
}
