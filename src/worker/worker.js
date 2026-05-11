import cron from 'node-cron';
import * as engineService from "../service/engineService.js";

cron.schedule('*/10 * * * * *', async () => {
    console.log('Queue Cron Triggered');
    await engineService.processQueue();
});

cron.schedule('0 */15 * * * *', async () => {
    console.log('Reset Stuck Jobs Cron Triggered');
    await engineService.resetStuckJobs();
});