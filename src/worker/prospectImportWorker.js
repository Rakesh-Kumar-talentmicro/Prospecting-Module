import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import importRedis, { importProgressRedis } from '../config/importRedis.js';
import { PROSPECT_IMPORT_QUEUE_NAME } from '../constants/importQueue.js';
import { processProspectImportJob } from '../service/prospectImportService.js';

dotenv.config();

const worker = new Worker(
  PROSPECT_IMPORT_QUEUE_NAME,
  async (job) => {
    await processProspectImportJob(job.data);
  },
  {
    connection: importRedis,
    concurrency: Number(process.env.IMPORT_WORKER_CONCURRENCY || 1),
    lockDuration: Number(process.env.IMPORT_WORKER_LOCK_DURATION_MS || 10 * 60 * 1000),
    stalledInterval: Number(process.env.IMPORT_WORKER_STALLED_INTERVAL_MS || 30 * 1000)
  }
);

worker.on('completed', (job) => {
  console.log(`Prospect import completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`Prospect import failed: ${job?.id || 'unknown'}`, err);
});

const shutdown = async () => {
  console.log('Closing prospect import worker...');
  await worker.close();
  await importRedis.quit().catch(() => importRedis.disconnect());
  await importProgressRedis.quit().catch(() => importProgressRedis.disconnect());
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Prospect import worker listening on queue ${PROSPECT_IMPORT_QUEUE_NAME}`);
