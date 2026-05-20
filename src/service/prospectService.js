export const bulkInsertProspects = async (prospects, userId, langId = 'EN', db) => {
  const [firstStageRows] = await db.query(
    'SELECT stage_code FROM stage_master WHERE language_id = ? AND sequence = 1 LIMIT 1',
    [langId]
  );
  let stageCode = 1;
  if (firstStageRows.length > 0) {
    stageCode = firstStageRows[0].stage_code;
  } else {
    const [anyFirst] = await db.query('SELECT stage_code FROM stage_master WHERE sequence = 1 LIMIT 1');
    if (anyFirst.length > 0) stageCode = anyFirst[0].stage_code;
  }

  const rows = prospects.filter(p => p.email || p.phone);
  if (rows.length === 0) return { inserted: 0, skipped: prospects.length };

  const emails = rows.map(p => p.email).filter(Boolean);
  const phones = rows.map(p => p.phone).filter(Boolean);

  let existingEmails = new Set();
  let existingPhones = new Set();

  if (emails.length > 0) {
    const [existingEmailRows] = await db.query('SELECT email FROM md_prospects WHERE email IN (?)', [emails]);
    existingEmailRows.forEach(r => existingEmails.add(r.email));
  }
  if (phones.length > 0) {
    const [existingPhoneRows] = await db.query('SELECT phone FROM md_prospects WHERE phone IN (?)', [phones]);
    existingPhoneRows.forEach(r => existingPhones.add(r.phone));
  }

  const validRows = rows.filter(p => !existingEmails.has(p.email) && !existingPhones.has(p.phone));
  if (validRows.length === 0) return { inserted: 0, skipped: prospects.length };

  const validValues = validRows.map(p => [
    p.company_name || null, p.contact_name || null, p.job_title || null,
    p.email || null, p.phone || null,
    p.linkedin_url || null, p.twitter_url || null, p.facebook_url || null, p.instagram_url || null,
    stageCode, userId, p.source_id || null
  ]);

  const [result] = await db.query(
    'INSERT INTO md_prospects (company_name, contact_name, job_title, email, phone, linkedin_url, twitter_url, facebook_url, instagram_url, stage_code, created_by, source_id) VALUES ?',
    [validValues]
  );

  return { inserted: result.affectedRows, skipped: prospects.length - result.affectedRows };
};

export const moveStage = async ({ prospectId, newStage, reasonId, userId }, db) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const [rows] = await connection.query(
      'SELECT stage_code FROM md_prospects WHERE id = ? FOR UPDATE',
      [prospectId]
    );
    if (rows.length === 0) throw new Error('PROSPECT_NOT_FOUND');
    const currentStage = rows[0].stage_code;

    const [stageMeta] = await connection.query(
      'SELECT requires_reason FROM stage_master WHERE stage_code=? AND language_id=? LIMIT 1',
      [newStage, 'EN']
    );
    if (stageMeta.length > 0 && stageMeta[0].requires_reason && !reasonId) {
      throw new Error('REASON_REQUIRED');
    }

    await connection.query(
      'UPDATE md_prospects SET stage_code=?, reason_id=?, updated_at=NOW(), updated_by=? WHERE id=?',
      [newStage, reasonId || null, userId, prospectId]
    );
    await connection.query(
      'INSERT INTO stage_logs (prospect_id,from_stage,to_stage,moved_by,reason_id) VALUES (?,?,?,?,?)',
      [prospectId, currentStage, newStage, userId, reasonId || null]
    );
    await connection.query(
      'INSERT INTO td_stage_logs (prospect_id,from_stage,to_stage,moved_by,reason_id) VALUES (?,?,?,?,?)',
      [prospectId, currentStage, newStage, userId, reasonId || null]
    );
    await connection.commit();
    return { success: true, from: currentStage, to: newStage };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const transferProspects = async ({ prospectIds, toUserId, fromUserId, adminId }, db) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    await connection.query(
      'UPDATE md_prospects SET assigned_user_id=?, updated_at=NOW() WHERE id IN (?)',
      [toUserId, prospectIds]
    );
    const logRows = prospectIds.map(id => [id, fromUserId, toUserId, adminId]);
    await connection.query(
      'INSERT INTO transfer_logs (prospect_id,from_user,to_user,transferred_by) VALUES ?',
      [logRows]
    );
    await connection.query(
      'INSERT INTO td_transfer_logs (prospect_id,from_user,to_user,transferred_by) VALUES ?',
      [logRows]
    );
    await connection.commit();
    return { transferred: prospectIds.length };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
