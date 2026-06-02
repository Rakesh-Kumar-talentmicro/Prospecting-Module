USE prospects_module;



DROP TABLE IF EXISTS md_message_channel_enum;
DROP TABLE IF EXISTS md_message_status_enum;




DESCRIBE md_message_templates;
DESCRIBE td_messages_queue;
DESCRIBE md_prospects;




DELETE FROM md_message_templates
WHERE template_code IN ('WELCOME', 'FOLLOWUP');




INSERT INTO md_message_templates
  (template_code, language_id, channel, subject, body, variables)
VALUES

-- ── WELCOME · EMAIL ─────────────────────────────────────────
(
  'WELCOME', 'EN', 'EMAIL',
  'Welcome to Our Website, {{first_name}} {{last_name}}!',
  '<p>Hi {{first_name}} {{last_name}},</p>
   <p>Welcome aboard! Our agent <strong>{{agent_name}}</strong> will reach out within <strong>{{response_hours}}</strong> hours.</p>
   <p>Company: {{company_name}}</p>
   <p>Thanks,<br>The Team</p>',
  '["first_name","last_name","agent_name","response_hours","company_name"]'
),
(
  'WELCOME', 'HI', 'EMAIL',
  '{{first_name}} {{last_name}}, हमारे प्लेटफ़ॉर्म पर आपका स्वागत है!',
  '<p>नमस्ते {{first_name}} {{last_name}},</p>
   <p>हमारे एजेंट <strong>{{agent_name}}</strong> आपसे <strong>{{response_hours}}</strong> घंटों में संपर्क करेंगे।</p>
   <p>कंपनी: {{company_name}}</p>
   <p>धन्यवाद,<br>टीम</p>',
  '["first_name","last_name","agent_name","response_hours","company_name"]'
),

-- ── WELCOME · SMS ────────────────────────────────────────────
(
  'WELCOME', 'EN', 'SMS',
  '',
  'Hi {{first_name}} {{last_name}}, welcome to {{company_name}}! Our agent {{agent_name}} will contact you within {{response_hours}} hours.',
  '["first_name","last_name","company_name","agent_name","response_hours"]'
),
(
  'WELCOME', 'HI', 'SMS',
  '',
  'नमस्ते {{first_name}} {{last_name}}, {{company_name}} में आपका स्वागत है! एजेंट {{agent_name}} {{response_hours}} घंटों में संपर्क करेंगे।',
  '["first_name","last_name","company_name","agent_name","response_hours"]'
),

-- ── WELCOME · WHATSAPP ───────────────────────────────────────
(
  'WELCOME', 'EN', 'WHATSAPP',
  '',
  'Hello {{first_name}} {{last_name}} \n\nWelcome to *{{company_name}}*!\n\nOur agent *{{agent_name}}* will get in touch within *{{response_hours}} hours*.',
  '["first_name","last_name","company_name","agent_name","response_hours"]'
),
(
  'WELCOME', 'HI', 'WHATSAPP',
  '',
  'नमस्ते {{first_name}} {{last_name}} \n\n*{{company_name}}* में आपका स्वागत है!\n\nएजेंट *{{agent_name}}* आपसे *{{response_hours}} घंटों* में संपर्क करेंगे।',
  '["first_name","last_name","company_name","agent_name","response_hours"]'
),

-- ── FOLLOWUP · EMAIL ─────────────────────────────────────────
(
  'FOLLOWUP', 'EN', 'EMAIL',
  'Following Up With You, {{first_name}} {{last_name}}',
  '<p>Hi {{first_name}} {{last_name}},</p>
   <p>Following up on your inquiry at <strong>{{company_name}}</strong>.</p>
   <p>Your current stage: <strong>{{stage_name}}</strong>.</p>
   <p>Reach out to <strong>{{agent_name}}</strong> anytime.</p>
   <p>Thanks,<br>The Team</p>',
  '["first_name","last_name","company_name","stage_name","agent_name"]'
),
(
  'FOLLOWUP', 'HI', 'EMAIL',
  '{{first_name}} {{last_name}}, आपसे फॉलो-अप',
  '<p>नमस्ते {{first_name}} {{last_name}},</p>
   <p><strong>{{company_name}}</strong> में आपकी जानकारी के बारे में फॉलो-अप।</p>
   <p>आपका वर्तमान चरण: <strong>{{stage_name}}</strong>।</p>
   <p>एजेंट <strong>{{agent_name}}</strong> से संपर्क करें।</p>
   <p>धन्यवाद,<br>टीम</p>',
  '["first_name","last_name","company_name","stage_name","agent_name"]'
),

-- ── FOLLOWUP · SMS ───────────────────────────────────────────
(
  'FOLLOWUP', 'EN', 'SMS',
  '',
  'Hi {{first_name}} {{last_name}}, following up from {{company_name}}. Your stage: {{stage_name}}. Contact {{agent_name}} for more info.',
  '["first_name","last_name","company_name","stage_name","agent_name"]'
),
(
  'FOLLOWUP', 'HI', 'SMS',
  '',
  'नमस्ते {{first_name}} {{last_name}}, {{company_name}} से फॉलो-अप। आपका चरण: {{stage_name}}। जानकारी के लिए {{agent_name}} से संपर्क करें।',
  '["first_name","last_name","company_name","stage_name","agent_name"]'
),

-- ── FOLLOWUP · WHATSAPP ──────────────────────────────────────
(
  'FOLLOWUP', 'EN', 'WHATSAPP',
  '',
  'Hi {{first_name}} {{last_name}} \n\nFollow-up from *{{company_name}}*.\n\nYour stage: *{{stage_name}}*\n\nContact *{{agent_name}}* for any queries. 🙌',
  '["first_name","last_name","company_name","stage_name","agent_name"]'
),
(
  'FOLLOWUP', 'HI', 'WHATSAPP',
  '',
  'नमस्ते {{first_name}} {{last_name}} \n\n*{{company_name}}* की तरफ से फॉलो-अप।\n\nआपका चरण: *{{stage_name}}*\n\n*{{agent_name}}* से संपर्क करें। 🙌',
  '["first_name","last_name","company_name","stage_name","agent_name"]'
);



-- First check if this email already exists to avoid duplicate
SELECT id, contact_name, email FROM md_prospects
WHERE email = 'shanhashmi.sh67@gmail.com';


INSERT INTO md_prospects
  (contact_name, company_name, email, phone, stage_code, preferred_lang_id, created_by)
VALUES
  ('Rahul Sharma', 'Acme Corp', 'shanhashmi.sh67@gmail.com', '+919876543210', 1, 'EN', 1);



SELECT
  id,
  template_code,
  language_id,
  channel,
  subject
FROM md_message_templates
ORDER BY template_code, channel, language_id;


SELECT
  id,
  contact_name,
  company_name,
  email,
  phone,
  stage_code
FROM md_prospects
WHERE email = 'shanhashmi.sh67@gmail.com';


SHOW TABLES LIKE '%enum%';
