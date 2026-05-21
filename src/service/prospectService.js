export const moveStage = async ({ prospectId, newStageLg, reasonId, userId }, db) => {
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
      'SELECT stage_code FROM md_stages_translation WHERE stage_in_lang = ? LIMIT 1',
      [newStageLg]
    );
    if (stageMeta.length === 0) throw new Error('STAGE_NOT_FOUND');

    await connection.query(
      'UPDATE md_prospects SET stage_code=?, reason_id=?, updated_at=NOW(), updated_by=? WHERE id=?',
      [stageMeta[0].stage_code, reasonId || null, userId, prospectId]
    );
    await connection.query(
      'INSERT INTO td_stage_logs (prospect_id,from_stage,to_stage,moved_by,reason_id) VALUES (?,?,?,?,?)',
      [prospectId, currentStage, stageMeta[0].stage_code, userId, parseInt(reasonId) || null]
    );
    await connection.commit();
    return { success: true, from: currentStage, to: stageMeta[0].stage_code };
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
    const ids = Array.isArray(prospectIds) ? prospectIds : [prospectIds];
    await connection.query(
      'UPDATE md_prospects SET assigned_user_id=?, updated_at=NOW() WHERE id IN (?)',
      [toUserId, ids]
    );
    const logRows = ids.map(id => [id, fromUserId, toUserId, adminId]);
    await connection.query(
      'INSERT INTO td_transfer_logs (prospect_id, from_user, to_user, transferred_by) VALUES ?',
      [logRows]
    );
    await connection.commit();
    return { transferred: ids.length };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const bulkInsertProspects = async (
  prospects,
  userId,
  lag_id = 'EN',
  db
) => {

  const values = [];
  const InvalidProspect = [];

  for (const p of prospects) {
    if (!p.email && !p.phone) {
      InvalidProspect.push(p);
      continue;
    }
    // check duplicate prospect
    const [existing] = await db.query(
      `
        SELECT id 
        FROM md_prospects
        WHERE email = ? OR phone = ?
        LIMIT 1
      `,
      [p.email ||null, p.phone ||null]
    );
    if (existing.length > 0) {
      continue;
    }

    values.push([
      p.company_name || null,
      p.contact_name || null,
      p.job_title || null,
      p.email,
      p.phone,
      p.linkedin_url || null,
      p.twitter_url || null,
      p.facebook_url || null,
      p.instagram_url || null,
      1,
      userId,
      p.source_id || null
    ]);
  }

  if (values.length == 0) {
    return {
      inserted: 0,
      skipped: prospects.length
    };
  }

  const [result] = await db.query(
    `
      INSERT INTO md_prospects (
        company_name,
        contact_name,
        job_title,
        email,
        phone,
        linkedin_url,
        twitter_url,
        facebook_url,
        instagram_url,
        stage_code,
        created_by,
        source_id
      )
      VALUES ?
    `,
    [values]
  );

  return {
    inserted: result.affectedRows,
    skipped: prospects.length - result.affectedRows
  };
};