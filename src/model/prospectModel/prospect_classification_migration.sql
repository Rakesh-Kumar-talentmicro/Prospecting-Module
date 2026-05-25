-- MySQL Workbench migration for prospect classification, explicit sourcing,
-- status ordering, Direct source, and prospect update logs.
-- Run each ALTER only if the target column/index/table does not already exist.

ALTER TABLE md_prospects
  ADD COLUMN industry_id INT NULL AFTER twitter_url;

ALTER TABLE md_prospects
  ADD COLUMN industry_size_id INT NULL AFTER industry_id;

ALTER TABLE md_prospects
  MODIFY COLUMN source_id INT DEFAULT 1;

ALTER TABLE md_prospects
  ADD COLUMN sourced_date DATETIME DEFAULT CURRENT_TIMESTAMP AFTER referral_name;

ALTER TABLE md_prospects
  ADD COLUMN sourced_by_name VARCHAR(255) NULL AFTER sourced_date;

ALTER TABLE md_prospects
  ADD INDEX idx_industry (industry_id);

ALTER TABLE md_prospects
  ADD INDEX idx_industry_size (industry_size_id);

ALTER TABLE md_prospects
  ADD INDEX idx_source (source_id);

ALTER TABLE md_stages
  ADD COLUMN seq INT NULL AFTER stage_key;

UPDATE md_stages
SET seq = stage_code
WHERE seq IS NULL;

-- Prospect stages are now the single 5-stage pipeline:
-- Pending 0, Attempted 30, Engaged 60, Converted 100, Parked -100.
-- Legacy negative stages move into Parked and keep/receive a reason.
SET @default_parked_reason_id := (
  SELECT reason_id
  FROM md_reasons
  ORDER BY reason_id
  LIMIT 1
);
SET @needs_stage_remap := (
  SELECT COUNT(*)
  FROM md_stages
  WHERE stage_code = 5
    AND stage_key = 'CONVERTED'
);

SET @previous_sql_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

UPDATE md_prospects
SET reason_id = COALESCE(reason_id, @default_parked_reason_id)
WHERE @needs_stage_remap > 0
  AND stage_code IN (6, 7, 8);

UPDATE td_stage_logs
SET reason_id = COALESCE(reason_id, @default_parked_reason_id)
WHERE @needs_stage_remap > 0
  AND to_stage IN (6, 7, 8);

UPDATE md_prospects
SET stage_code = CASE
  WHEN stage_code IN (4, 5) THEN 4
  WHEN stage_code IN (6, 7, 8) THEN 5
  ELSE stage_code
END
WHERE @needs_stage_remap > 0
  AND stage_code IN (1, 2, 3, 4, 5, 6, 7, 8);

UPDATE td_stage_logs
SET from_stage = CASE
  WHEN from_stage IN (4, 5) THEN 4
  WHEN from_stage IN (6, 7, 8) THEN 5
  ELSE from_stage
END
WHERE @needs_stage_remap > 0
  AND from_stage IN (1, 2, 3, 4, 5, 6, 7, 8);

UPDATE td_stage_logs
SET to_stage = CASE
  WHEN to_stage IN (4, 5) THEN 4
  WHEN to_stage IN (6, 7, 8) THEN 5
  ELSE to_stage
END
WHERE @needs_stage_remap > 0
  AND to_stage IN (1, 2, 3, 4, 5, 6, 7, 8);

UPDATE md_prospects
SET reason_id = NULL
WHERE @needs_stage_remap > 0
  AND stage_code <> 5
  AND reason_id IS NOT NULL;

UPDATE td_stage_logs
SET reason_id = NULL
WHERE @needs_stage_remap > 0
  AND to_stage <> 5
  AND reason_id IS NOT NULL;

UPDATE md_stages
SET stage_key = CONCAT('LEGACY_', stage_key, '_', stage_code)
WHERE @needs_stage_remap > 0
  AND stage_code IN (2, 3, 4, 5, 6, 7, 8);

DELETE FROM md_stages_translation
WHERE stage_code IN (1, 2, 3, 4, 5, 6, 7, 8);

DELETE FROM md_stages
WHERE stage_code IN (6, 7, 8);

INSERT INTO md_stages (stage_code, stage_key, seq, progress)
VALUES
  (1, 'PENDING', 1, 0),
  (2, 'ATTEMPTED', 2, 30),
  (3, 'ENGAGED', 3, 60),
  (4, 'CONVERTED', 4, 100),
  (5, 'PARKED', 5, -100)
AS new_stage
ON DUPLICATE KEY UPDATE
  stage_key = new_stage.stage_key,
  seq = new_stage.seq,
  progress = new_stage.progress;

INSERT INTO md_stages_translation (stage_code, lang_id, stage_in_lang)
VALUES
  (1, 'EN', 'Pending'),
  (2, 'EN', 'Attempted'),
  (3, 'EN', 'Engaged'),
  (4, 'EN', 'Converted'),
  (5, 'EN', 'Parked')
AS new_stage_translation
ON DUPLICATE KEY UPDATE
  stage_in_lang = new_stage_translation.stage_in_lang;

SET SQL_SAFE_UPDATES = @previous_sql_safe_updates;

ALTER TABLE md_activity_status
  ADD COLUMN seq INT NULL AFTER activity_title;

UPDATE md_activity_status
SET seq = activity_id
WHERE seq IS NULL;

-- Keep Direct as the default source id. This intentionally makes source_id 1 Direct.
UPDATE md_sources
SET source_key = 'DIRECT', lang_id = 'EN'
WHERE source_id = 1;

INSERT INTO md_sources (source_key, lang_id)
VALUES
  ('MARKET RESEARCH', 'EN'),
  ('APOLLO', 'EN'),
  ('ZOOM', 'EN')
AS new_source
ON DUPLICATE KEY UPDATE
  source_key = new_source.source_key;

CREATE TABLE td_prospect_update_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prospect_id BIGINT NOT NULL,
    change_type VARCHAR(20) NOT NULL DEFAULT 'UPDATE',
    old_values JSON NULL,
    new_values JSON NULL,
    changed_by BIGINT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prospect_update_log_prospect (prospect_id),
    INDEX idx_prospect_update_log_changed_at (changed_at),
    CONSTRAINT fk_td_prospect_update_logs_prospect
      FOREIGN KEY (prospect_id) REFERENCES md_prospects (id)
      ON DELETE CASCADE
);
