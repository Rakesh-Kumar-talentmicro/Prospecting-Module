CREATE TABLE IF NOT EXISTS td_prospect_stage_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    prospect_id BIGINT NOT NULL,
    stage_code INT NOT NULL,
    reason_id INT NULL,
    updated_by BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stage_prospect
        FOREIGN KEY (prospect_id)
        REFERENCES md_prospects(id),

    INDEX idx_prospect (prospect_id),
    INDEX idx_stage (stage_code),
    INDEX idx_created_at (created_at)
);