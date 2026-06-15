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
    removeOnComplete: {
      count: Number(process.env.IMPORT_QUEUE_KEEP_COMPLETED || 1000)
    },
    removeOnFail: {
      count: Number(process.env.IMPORT_QUEUE_KEEP_FAILED || 1000)
    }
  }
});
