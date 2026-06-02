import cron from 'node-cron';
import * as engineService from "../service/engineService.js";

let isQueueRunning = false;

cron.schedule('*/10 * * * * *', async () => {
  if (isQueueRunning) {
    console.log('Previous queue cron still running, skipping...');
    return;
  }
  try {
    isQueueRunning = true;
    console.log('Queue Cron Triggered');
    await engineService.processQueue();
  } finally {
    isQueueRunning = false;
  }
});

cron.schedule('0 */15 * * * *', async () => {
  console.log('Reset Stuck Jobs Cron Triggered');
  await engineService.resetStuckJobs();
});