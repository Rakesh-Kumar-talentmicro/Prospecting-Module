import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS td_prospects (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    company_name      VARCHAR(255),
    first_name        VARCHAR(255),
    last_name         VARCHAR(255),
    job_title         VARCHAR(255),
    email             VARCHAR(255),
    phone             VARCHAR(50),
    city              VARCHAR(100),
    state             VARCHAR(100),
    country           VARCHAR(100),
    industry_id       INT NULL,
    industry_size_id  INT NULL,
    website_url       VARCHAR(255),
    source_id         INT NULL,
    referral_name     VARCHAR(50) NULL,
    preferred_lang_id VARCHAR(10) DEFAULT 'EN',
    source_bd_id      BIGINT,
    duplicate_count   INT,
    prospect_key      VARCHAR(255),
    status            SMALLINT DEFAULT 1,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_source (source_id)
);
`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);

        console.log("td_prospects table created successfully");

    } catch (err) {
        console.error("Error creating td_prospects table", err);

    }
}