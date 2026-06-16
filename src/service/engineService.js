import db from '../config/db.js';
import os from 'os';
import { sendEmail } from '../utils/sendEmail.js';
import { sendSMS } from '../utils/sendSMS.js';
import { sendWhatsapp } from '../utils/sendWhatsapp.js';
import { closeActivitiesByQueueIds } from './activityService.js';

const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 3;
const WORKER_ID = `${os.hostname()}-${process.pid}`;


export const resetStuckJobs = async () => {
    try {
        const [result] = await db.query(`
        UPDATE td_messages_queue
        SET
            status = 'PENDING',
            worker_id = NULL,
            last_attempt_at = NULL
        WHERE status = 'PROCESSING'
          AND last_attempt_at < NOW() - INTERVAL 15 MINUTE
    `);
        if (result.affectedRows > 0) {
            console.log(`[ENGINE] Reset ${result.affectedRows} stuck jobs`);
        }
    } catch (err) {
        console.error('[ENGINE] Reset Job Error:', err.message);
    }
};


export const processQueue = async () => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        await connection.query(`
            UPDATE td_messages_queue
            SET
                status = 'PROCESSING',
                worker_id = ?,
                last_attempt_at = NOW()
            WHERE status = 'PENDING'
              AND isActive = TRUE
              AND attempt_number < max_attempt_number
            ORDER BY id
            LIMIT ?
        `, [WORKER_ID,BATCH_SIZE]);
        const [messages] = await connection.query(`
            SELECT
                id,
                channel,
                prospect_id,
                template_id,
                to_address,
                payload,
                attempt_number,
                max_attempt_number,
                created_by
            FROM td_messages_queue
            WHERE worker_id = ?
              AND status = 'PROCESSING'
            ORDER BY id
        `, [WORKER_ID]);

        await connection.commit();
        connection.release();
        connection = null;

        if (!messages.length) {
            console.log(`[ENGINE:${WORKER_ID}] No pending messages`);
            return;
        }

        const successIds = [];
        const failedIds = [];
        const logs = [];
        const permanentlyFailedIds = [];
        for (const message of messages) {
            try {
                let payload = {};
                try {
                    payload = typeof message.payload === 'string' ? JSON.parse(message.payload) : message.payload || {};
                } catch {
                    payload = {};
                }
                const subject = payload.subject || '';
                const body = payload.body || '';
                let response = null;
                switch (message.channel) {
                    case 'EMAIL':
                        response = await sendEmail({to: message.to_address,subject,body});
                        break;
                    case 'SMS':
                        response = await sendSMS({to_address: message.to_address,body});
                        break;
                    case 'WHATSAPP':
                        response = await sendWhatsapp({to_address: message.to_address,body});
                        break;
                    default:
                        throw new Error(`Unsupported channel ${message.channel}`);
                }

                successIds.push(message.id);
                logs.push([
                    message.id,
                    message.channel,
                    'SUCCESS',
                    response?.provider || null,
                    response?.messageId || null,
                    message.to_address,
                    JSON.stringify(response || {}),
                    null
                ]);

            } catch (err) {

                failedIds.push(message.id);
                if (message.attempt_number + 1 >=message.max_attempt_number)
                {
                    permanentlyFailedIds.push(message.id);
                }
                logs.push([
                    message.id,
                    message.channel,
                    'FAILED',
                    null,
                    null,
                    message.to_address,
                    null,
                    err.message
                ]);
            }
        }

        if (successIds.length) {

            await db.query(`
                UPDATE td_messages_queue
                SET
                    status = 'SENT',
                    sent_at = NOW(),
                    worker_id = NULL,
                    attempt_number = attempt_number + 1
                WHERE id IN (?)
            `, [successIds]);

            await db.query(
                `
                UPDATE td_activity
                SET
                    activity_status = 2
                WHERE message_queue_id IN (?)
                `,[successIds]
            );
        }

        if (failedIds.length) {

            await db.query(`
                UPDATE td_messages_queue
                SET
                    status = CASE
                        WHEN attempt_number + 1 >= max_attempt_number
                        THEN 'FAILED'
                        ELSE 'PENDING'
                    END,
                    worker_id = NULL,
                    attempt_number = attempt_number + 1,
                    last_attempt_at = NOW()
                WHERE id IN (?)
            `, [failedIds]);
        }
        if (permanentlyFailedIds.length) {
            await db.query(
                `
                UPDATE td_activity
                SET
                    activity_status = 3
                WHERE message_queue_id IN (?)
                `,
                [permanentlyFailedIds]
            );
        }
        if (logs.length) {

            await db.query(`
                INSERT INTO td_message_logs (
                    queue_id,
                    channel,
                    status,
                    provider,
                    provider_msg_id,
                    to_address,
                    response_body,
                    error_message
                )
                VALUES ?
            `, [logs]);
        }

        console.log(
            `[ENGINE:${WORKER_ID}] Sent=${successIds.length}, Failed=${failedIds.length}`
        );

    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch(err) {console.error(err.message)}
        }

    } finally {
        if (connection) {connection.release();}
    }
};
