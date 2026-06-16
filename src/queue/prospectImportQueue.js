import { Queue } from 'bullmq';
import importRedis from '../config/importRedis.js';
import { PROSPECT_IMPORT_QUEUE_NAME } from '../constants/importQueue.js';

export { PROSPECT_IMPORT_QUEUE_NAME };

export const prospectImportQueue = new Queue(PROSPECT_IMPORT_QUEUE_NAME, {
  connection: importRedis,
  defaultJobOptions: {
    attempts: Number(process.env.IMPORT_JOB_ATTEMPTS || 1),
    backoff: {
      type: 'exponential',
      delay: Number(process.env.IMPORT_JOB_BACKOFF_MS || 5000)
    },
    // Remove completed job payloads from Redis after 2 minutes (age) or
    // once more than 10 completed jobs accumulate — whichever comes first.
    // This prevents BullMQ from filling Redis with stale job LIST/HASH data.
    removeOnComplete: {
      age:   Number(process.env.IMPORT_QUEUE_COMPLETED_AGE_SEC  || 120),
      count: Number(process.env.IMPORT_QUEUE_KEEP_COMPLETED     || 10),
    },
    removeOnFail: {
      age:   Number(process.env.IMPORT_QUEUE_FAILED_AGE_SEC     || 120),
      count: Number(process.env.IMPORT_QUEUE_KEEP_FAILED        || 10),
    },
  }
});