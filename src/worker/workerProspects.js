import cron from 'node-cron';
import * as prospect  from '../service/prospectService.js';

// every 30 seconds
let isRunning = false;

cron.schedule('*/30 * * * * *', async () => {
  if (isRunning) {
    console.log('Previous prospect cron still running...');
    return;
  }

  try {
    isRunning = true;
    const BATCH_SIZE = 50;
    console.log("Cron job is running");
    const result = await prospect.processProspect();
    console.log(result);
  } finally {
    isRunning = false;
    console.log("Cron job is close");
  }
});

// cron.schedule('*/30 * * * * *', async () => {
//   console.log("Cron job is running");
//    await prospect.processProspects();
// });