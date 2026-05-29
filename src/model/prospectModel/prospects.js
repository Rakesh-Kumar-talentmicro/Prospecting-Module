import db from "../../config/db.js";

const createTableQuery = `
 HEAD
CREATE TABLE IF NOT EXISTS mt_prospects (  

CREATE TABLE IF NOT EXISTS md_prospects (  
 868b2e10247b9bc968d731667cb9f81afcb56e84
    id                BIGINT PRIMARY KEY AUTO_INCREMENT,  
    company_name      VARCHAR(255),  
    contact_name      VARCHAR(255),  
    job_title         VARCHAR(255),  
    email             VARCHAR(255),  
    phone             VARCHAR(50),  
    linkedin_url      VARCHAR(255),  
    facebook_url      VARCHAR(255),  
    instagram_url     VARCHAR(255),  
    twitter_url       VARCHAR(255),  
    source_id         INT,  
    stage_code        INT          NOT NULL,  
    assigned_user_id  BIGINT,  
    reason_id         INT          NULL,  
    notes             TEXT         NULL,
    follow_up_date    DATETIME     NULL,  
    preferred_lang_id VARCHAR(10)  DEFAULT 'EN',  
    created_at        DATETIME     DEFAULT CURRENT_TIMESTAMP,  
    created_by        BIGINT,  
    updated_at        DATETIME,  
    updated_by        BIGINT,  
    INDEX idx_stage    (stage_code),  
    INDEX idx_user     (assigned_user_id),  
    INDEX idx_email    (email),  
    INDEX idx_phone    (phone),  
    INDEX idx_follow_up (follow_up_date)  
);
`;

export async function createTable() {
    try {
        await db.execute(createTableQuery);
 HEAD
        console.log("prospects table created successfully");
    } catch (err) {
        console.error("Error creating prospects table", err);

        console.log("md_prospects table created successfully");
    } catch (err) {
        console.error("Error creating md_prospects table", err);
 868b2e10247b9bc968d731667cb9f81afcb56e84
    }
}
