const cron = require('node-cron');
const db = require('../db/connection');
const logger = require('../db/logger');
const config = require('../config');

const runDeadlockRescue = async () => {
  try {
    const [result] = await db.query(
      `UPDATE td_message_queue
       SET status = CASE
         WHEN retry_count < max_retries THEN 'PENDING'
         ELSE 'FAILED'
       END
       WHERE status = 'PROCESSING'
       AND last_attempt_at < NOW() - INTERVAL ? MINUTE`,
      [config.worker.deadlockRescueMinutes]
    );

    if (result.affectedRows > 0) {
      logger.warn(`[CRON] Rescued ${result.affectedRows} stuck messages`);
    }
  } catch (err) {
    logger.error(`[CRON] Deadlock rescue failed: ${err.message}`);
  }
};

cron.schedule('* * * * *', runDeadlockRescue);
logger.info('[CRON] 🕐 Deadlock rescue started — runs every 60 seconds');

module.exports = { runDeadlockRescue };