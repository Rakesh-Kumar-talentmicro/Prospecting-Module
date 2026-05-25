import db from '../config/db.js';
import os from 'os';
import { sendEmail } from '../utils/sendEmail.js';
import { sendSMS } from '../utils/sendSMS.js';
import { sendWhatsapp } from '../utils/sendWhatsapp.js';
import { closeActivitiesByQueueIds } from './activityService.js';

const WORKER_ID = `${os.hostname()}-${process.pid}`;
const MAX_RETRY = 3;
const BATCH_SIZE = 1000;
export const resetStuckJobs = async () => {
    try {
        const [result] = await db.query(`CALL sp_reset_stuck_jobs()`);
        if (result.affectedRows > 0) {
            console.log(`Reset ${result.affectedRows} stuck jobs`);
        }
    } catch (err) {
        console.log('Reset Job Error:', err);
    }
};
export const processQueue = async () => {
    let connection;
    try {
        connection = await db.getConnection();
        const [claimResult] = await connection.query(`CALL sp_claim_queue_messages(?, ?, ?)`, [WORKER_ID, MAX_RETRY, BATCH_SIZE]);
        if (claimResult.affectedRows === 0) {
            console.log('No pending messages');
            return;
        }
        console.log(`Claimed ${claimResult.affectedRows} messages`);
        const [[messages]] = await connection.query(`CALL sp_get_worker_messages(?)`, [WORKER_ID]);
        const successIds = [];
        const failedIds = [];
        const logs = [];
        for (const msg of messages) {
            try {
                let response = null;
                if (msg.channel === 1) {
                    response = await sendEmail({
                        to: msg.to_address,
                        subject: msg.subject,
                        body: msg.body
                    });
                } else if (msg.channel === 2) {

                    response = await sendSMS({
                        to_address: msg.to_address,
                        body: msg.body
                    });
                } else if (msg.channel === 3) {

                    response = await sendWhatsapp({
                        to_address: msg.to_address,
                        body: msg.body
                    });
                }
                successIds.push(msg.id);
                logs.push([
                    msg.id,
                    msg.channel,
                    3,
                    response?.provider || null,
                    response?.messageId || null,
                    null,
                    JSON.stringify(response || {})
                ]);

            } catch (err) {
                failedIds.push(msg.id);
                logs.push([
                    msg.id,
                    msg.channel,
                    4,
                    null,
                    null,
                    err.message,
                    null
                ]);
            }
        }
        if (successIds.length > 0) {
            await connection.query(`CALL sp_mark_success_messages(?)`, [successIds.join(',')]);
            await closeActivitiesByQueueIds(successIds, connection);
        }
        if (failedIds.length > 0) {
            await connection.query(`CALL sp_mark_failed_messages(?, ?)`, [failedIds.join(','),MAX_RETRY]);
        }
        if (logs.length > 0) {
           await connection.query(`
            INSERT INTO td_message_logs (
            queue_id,
            channel,
            status,
            provider,
            provider_message_id,
            error_message,
            response_body
            )
            VALUES ?
            `,
            [logs]);
        }

        console.log('Queue processing completed');
    } catch (err) {
        console.log('Worker Error:', err);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
