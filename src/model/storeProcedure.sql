DELIMITER //

CREATE PROCEDURE sp_claim_queue_messages(
    IN p_worker_id VARCHAR(255),
    IN p_max_retry SMALLINT,
    IN p_batch_size INT
)
BEGIN

    UPDATE td_message_queue
    SET
        status = 2,
        worker_id = p_worker_id,
        locked_at = NOW()
    WHERE id IN (
        SELECT id
        FROM (
            SELECT id
            FROM td_message_queue
            WHERE status = 1
            AND retry_count < p_max_retry
            ORDER BY created_at ASC
            LIMIT p_batch_size
        ) x
    );

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

    SET @query = CONCAT(
        'UPDATE td_message_queue
         SET
            status = 3,
            processed_at = NOW(),
            worker_id = NULL,
            locked_at = NULL
         WHERE id IN (', p_ids, ')'
    );

    PREPARE stmt FROM @query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_mark_failed_messages(
    IN p_ids TEXT,
    IN p_max_retry INT
)
BEGIN

    SET @query = CONCAT(
        'UPDATE td_message_queue
         SET
            retry_count = retry_count + 1,
            status = CASE
                WHEN retry_count + 1 >= ', p_max_retry, '
                THEN 4
                ELSE 1
            END,
            worker_id = NULL,
            locked_at = NULL,
            error_message = "Message sending failed"
         WHERE id IN (', p_ids, ')'
    );

    PREPARE stmt FROM @query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

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
    AND locked_at < NOW();

END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_insert_message_log(
    IN p_queue_id BIGINT,
    IN p_channel SMALLINT,
    IN p_status SMALLINT,
    IN p_provider VARCHAR(100),
    IN p_provider_message_id VARCHAR(255),
    IN p_error_message TEXT,
    IN p_response_body TEXT
)
BEGIN

    INSERT INTO td_message_logs (
        queue_id,
        channel,
        status,
        provider,
        provider_message_id,
        error_message,
        response_body
    )
    VALUES (
        p_queue_id,
        p_channel,
        p_status,
        p_provider,
        p_provider_message_id,
        p_error_message,
        p_response_body
    );

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