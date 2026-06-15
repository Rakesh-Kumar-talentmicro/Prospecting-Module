import db from '../../config/db.js';

/**
 * td_duplicate — audit log for every duplicate prospect encountered during a bulk import.
 *
 * stage_status values:
 *   'duplicate_existing'   — the prospect_key already existed in md_prospects before this import
 *   'duplicate_in_batch'   — the prospect_key appeared more than once within the same import file
 *
 * count — how many extra occurrences were found (beyond the first/canonical occurrence)
 */
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS td_duplicate (
    id            INT          AUTO_INCREMENT PRIMARY KEY,
    import_uuid   CHAR(36)     NOT NULL,
    prospect_key  VARCHAR(500) NOT NULL,
    stage_status  VARCHAR(50)  NOT NULL,
    prospect_id   BIGINT       NULL,
    count         INT          NOT NULL DEFAULT 1,
    created_by    BIGINT       NULL,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_td_dup_import_uuid  (import_uuid),
    INDEX idx_td_dup_prospect_key (prospect_key),
    INDEX idx_td_dup_prospect_id  (prospect_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

export async function createTable() {
  try {
    await db.execute(createTableQuery);
    console.log('td_duplicate table created successfully');
  } catch (err) {
    console.error('Error creating td_duplicate table', err);
  }
}
