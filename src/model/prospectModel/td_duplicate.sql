CREATE TABLE td_duplicate (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prospect_id INT,
  email VARCHAR(255),
  phone VARCHAR (255),
  company_name VARCHAR(255),
  website_url VARCHAR(255),
  stage_status VARCHAR(255),
  update_by INT,
  source_id INT,
  count INT
);