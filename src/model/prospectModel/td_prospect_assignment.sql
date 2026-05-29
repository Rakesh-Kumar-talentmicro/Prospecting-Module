CREATE TABLE IF NOT EXISTS td_prospect_assignment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    prospect_id BIGINT NOT NULL,
    assigned_to BIGINT NULL,
    assigned_by BIGINT NULL,
    source_by BIGINT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignment_prospect
        FOREIGN KEY (prospect_id)
        REFERENCES md_prospects(id),

    INDEX idx_prospect (prospect_id),
    INDEX idx_assigned_to (assigned_to)
);
