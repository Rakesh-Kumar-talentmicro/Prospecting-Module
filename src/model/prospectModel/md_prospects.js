import db from "../../config/db.js";

const createTableQuery = `
CREATE TABLE IF NOT EXISTS md_prospects (
    id                BIGINT PRIMARY KEY AUTO_INCREMENT,  
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
    referral_name       VARCHAR(50) NULL,
    preferred_lang_id VARCHAR(10) DEFAULT 'EN',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    source_bd_id      BIGINT,
    stage_code        SMALLINT,
    prospect_key      VARCHAR(255) UNIQUE,
    country_iso       INT,
    UNIQUE KEY uq_prospect (email, phone, company_name),
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_source (source_id) 
);
`;

// source_bd_id in this table shows the bd person who are responsible for update and create.

export async function createTable() {
    try {
        await db.execute(createTableQuery);
        console.log("md_prospects table created successfully")
    } catch (err) {
        console.error("Error creating md_prospects table", err);
    }
}
