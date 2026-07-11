import { EventEmitter } from "node:events";
import type { ImportProgress } from "@groweasy/shared";

const JOB_TTL_MS = 15 * 60 * 1000;

interface JobRecord {
  progress: ImportProgress;
  emitter: EventEmitter;
  cleanupTimer?: NodeJS.Timeout;
  cancelled?: boolean;
}

const jobs = new Map<string, JobRecord>();

export function createJob(jobId: string, totalRecords: number, totalBatches: number): void {
  const progress: ImportProgress = {
    jobId,
    status: "processing",
    currentBatch: 0,
    totalBatches,
    currentBatchSize: 0,
    processedRecords: 0,
    totalRecords,
    message: "Queued for processing…",
  };

  jobs.set(jobId, { progress, emitter: new EventEmitter() });
}

export function updateJob(jobId: string, patch: Partial<ImportProgress>): void {
  const job = jobs.get(jobId);
  if (!job) return;

  job.progress = { ...job.progress, ...patch };
  job.emitter.emit("update", job.progress);

  if (job.progress.status === "completed" || job.progress.status === "failed") {
    job.cleanupTimer = setTimeout(() => jobs.delete(jobId), JOB_TTL_MS);
  }
}

export function getJobSnapshot(jobId: string): ImportProgress | undefined {
  return jobs.get(jobId)?.progress;
}

export function subscribeToJob(
  jobId: string,
  listener: (progress: ImportProgress) => void,
): (() => void) | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;

  job.emitter.on("update", listener);
  return () => job.emitter.off("update", listener);
}

export function jobExists(jobId: string): boolean {
  return jobs.has(jobId);
}

export function cancelJob(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.cancelled = true;
  job.progress = { ...job.progress, status: "failed", error: "Import cancelled by user." };
  job.emitter.emit("update", job.progress);
}

export function isJobCancelled(jobId: string): boolean {
  return jobs.get(jobId)?.cancelled === true;
}

export function clearAllJobs(): void {
  for (const job of jobs.values()) {
    if (job.cleanupTimer) clearTimeout(job.cleanupTimer);
  }
  jobs.clear();
}
