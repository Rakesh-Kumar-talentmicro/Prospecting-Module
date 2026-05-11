DELIMITER //

CREATE PROCEDURE sp_claim_queue_messages(
    IN p_worker_id VARCHAR(255),
    IN p_max_retry SMALLINT,
    IN p_batch_size INT
)
BEGIN

    UPDATE td_message_queue mq
    JOIN (
        SELECT id
        FROM td_message_queue
        WHERE status = 1
          AND retry_count < p_max_retry
        ORDER BY created_at ASC
        LIMIT p_batch_size
    ) AS q
    ON mq.id = q.id

    SET
        mq.status = 2,
        mq.worker_id = p_worker_id,
        mq.locked_at = NOW();

END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_get_worker_messages(
    IN p_worker_id VARCHAR(255)
)
BEGIN

    SELECT *
    FROM td_message_queue
    WHERE worker_id = p_worker_id
    AND status = 2;

END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_mark_success_messages(
    IN p_ids TEXT
)
BEGIN
    UPDATE td_message_queue
    SET
        status = 3,
        processed_at = NOW(),
        worker_id = NULL,
        locked_at = NULL
    WHERE FIND_IN_SET(id, p_ids);
END;

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_mark_failed_messages(
    IN p_ids TEXT,
    IN p_max_retry INT
)
BEGIN
    UPDATE td_message_queue
        SET
        retry_count = retry_count + 1,
        status = CASE
            WHEN retry_count + 1 >= p_max_retry THEN 4
            ELSE 1
        END,
        worker_id = NULL,
        locked_at = NULL,
        error_message = "Message sending failed"
        WHERE FIND_IN_SET(id, p_ids);

END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_reset_stuck_jobs()
BEGIN

    UPDATE td_message_queue
    SET
        status = 1,
        worker_id = NULL,
        locked_at = NULL 
    WHERE status = 2
    AND locked_at < NOW() - INTERVAL 15 MINUTE;

END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_enqueue_message(
    IN p_channel INT,
    IN p_prospect_id BIGINT,
    IN p_to_address VARCHAR(255),
    IN p_subject TEXT,
    IN p_body LONGTEXT
)
BEGIN

    INSERT INTO td_message_queue (
        channel,
        prospect_id,
        to_address,
        subject,
        body,
        status,
        created_at
    )
    VALUES (
        p_channel,
        p_prospect_id,
        p_to_address,
        p_subject,
        p_body,
        1,
        NOW()
    );

    SELECT LAST_INSERT_ID() AS queue_id;

END //

DELIMITER ;