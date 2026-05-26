import db from '../config/db.js';
import os from 'os';
import { sendEmail } from '../utils/sendEmail.js';
import { sendSMS } from '../utils/sendSMS.js';
import { sendWhatsapp } from '../utils/sendWhatsapp.js';

const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 3;
const WORKER_ID = `${os.hostname()}-${process.pid}`;


export const resetStuckJobs = async () => {
    try {
        const [result] = await db.query(
            `UPDATE td_messages_queue
             SET status = 'PENDING', last_attempt_at = NULL
             WHERE status = 'PROCESSING'
               AND last_attempt_at < NOW() - INTERVAL 15 MINUTE`
        );
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

        await connection.query(
            `UPDATE td_messages_queue
             SET status = 'PROCESSING', last_attempt_at = NOW()
             WHERE status = 'PENDING'
               AND isActive = 1
               AND attempt_number < max_attempt_number
             LIMIT ?`,
            [BATCH_SIZE]
        );

        const [messages] = await connection.query(
            `SELECT
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
             WHERE status = 'PROCESSING'
               AND last_attempt_at >= NOW() - INTERVAL 1 MINUTE`
        );

        await connection.commit();
        connection.release();
        connection = null;

        if (messages.length === 0) {
            console.log('[ENGINE] No pending messages');
            return;
        }

        console.log(`[ENGINE] Processing ${messages.length} messages`);

        const successIds = [];
        const failedIds  = [];
        const logs       = [];

        for (const msg of messages) {
            // Parse payload — stored as JSON string in DB
            let parsed = {};
            try {
                parsed = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
            } catch (_) {}

            const body    = parsed.body    || '';
            const subject = parsed.subject || '';

            try {
                let response = null;

                if (msg.channel === 'EMAIL') {
                    response = await sendEmail({
                        to: msg.to_address,
                        subject,
                        body,
                    });
                } else if (msg.channel === 'SMS') {
                    response = await sendSMS({
                        to_address: msg.to_address,
                        body,
                    });
                } else if (msg.channel === 'WHATSAPP') {
                    response = await sendWhatsapp({
                        to_address: msg.to_address,
                        body,
                    });
                }

                successIds.push(msg.id);

                logs.push([
                    msg.id,                          // queue_id
                    msg.channel,                     // channel ENUM string
                    msg.to_address,                  // to_address (required in real table)
                    response?.provider      || null, // provider
                    response?.messageId     || null, // provider_msg_id
                    'SUCCESS',                       // status ENUM('SUCCESS','FAILED')
                    null,                            // error_message
                    JSON.stringify(response || {}),  // response_body
                    msg.attempt_number + 1,          // attempt_number
                ]);

            } catch (err) {
                failedIds.push(msg.id);

                logs.push([
                    msg.id,
                    msg.channel,
                    msg.to_address,
                    null,
                    null,
                    'FAILED',
                    err.message,
                    null,
                    msg.attempt_number + 1,
                ]);
            }
        }

        
        if (successIds.length > 0) {
            await db.query(
                `UPDATE td_messages_queue
                 SET status = 'SENT', sent_at = NOW(),
                     attempt_number = attempt_number + 1
                 WHERE id IN (?)`,
                [successIds]
            );
        }

        
        if (failedIds.length > 0) {
            await db.query(
                `UPDATE td_messages_queue
                 SET status = CASE
                       WHEN attempt_number + 1 >= max_attempt_number THEN 'FAILED'
                       ELSE 'PENDING'
                     END,
                     attempt_number = attempt_number + 1,
                     last_attempt_at = NOW()
                 WHERE id IN (?)`,
                [failedIds]
            );
        }

       
        if (logs.length > 0) {
            await db.query(
                `INSERT INTO td_messages_logs
                   (queue_id, channel, to_address, provider, provider_msg_id,
                    status, error_message, response_body, attempt_number)
                 VALUES ?`,
                [logs]
            );
        }

        console.log(`[ENGINE] Done — sent: ${successIds.length}, failed: ${failedIds.length}`);

    } catch (err) {
        console.error('[ENGINE] Worker Error:', err.message);
    } finally {
        if (connection) connection.release();
    }
};