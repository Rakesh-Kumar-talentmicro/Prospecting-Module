import db from '../config/db.js';
import os from 'os';
import { sendEmail } from '../utils/sendEmail.js';
import { sendSMS } from '../utils/sendSMS.js';
import { sendWhatsapp } from '../utils/sendWhatsapp.js';

const WORKER_ID = `${os.hostname()}-${process.pid}`;
const MAX_RETRY = 3;
const BATCH_SIZE = 5000;
export const resetStuckJobs = async () => {
    try {
        const [result] = await db.query(`           
            UPDATE td_message_queue
            SET
                status = 1,
                worker_id = NULL,
                locked_at = NULL
            WHERE status = 2
            AND locked_at < NOW() - INTERVAL 15 MINUTE            
        `);
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
        const [claimResult] = await connection.query(`
            UPDATE td_message_queue
            SET
                status = 2,
                worker_id = ?,
                locked_at = NOW()
            WHERE id IN (
                SELECT id
                FROM (
                    SELECT id
                    FROM td_message_queue
                    WHERE status = 1
                    AND retry_count < ?
                    ORDER BY created_at ASC
                    LIMIT ?
                ) x
            )
        `, [WORKER_ID, MAX_RETRY, BATCH_SIZE]);
        if (claimResult.affectedRows === 0) {
            console.log('No pending messages');
            return;
        }
        console.log(`Claimed ${claimResult.affectedRows} messages`);
        const [messages] = await connection.query(`
            SELECT *
            FROM td_message_queue
            WHERE worker_id = ?
            AND status = 2            
        `, [WORKER_ID]);

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
            await connection.query(`                
                UPDATE td_message_queue
                SET
                    status = 3,
                    processed_at = NOW(),
                    worker_id = NULL,
                    locked_at = NULL
                WHERE id IN (?)                
            `, [successIds]);
        }
        if (failedIds.length > 0) {
            await connection.query(`                
                UPDATE td_message_queue
                SET
                    retry_count = retry_count + 1,
                    status = CASE
                        WHEN retry_count + 1 >= ?
                        THEN 4
                        ELSE 1
                    END,
                    worker_id = NULL,
                    locked_at = NULL,
                    error_message = 'Message sending failed'
                WHERE id IN (?)
            `, [MAX_RETRY, failedIds]);
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
            `, [logs]);
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