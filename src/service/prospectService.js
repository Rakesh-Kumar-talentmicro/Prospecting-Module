import { parse } from 'dotenv';
import db from '../config/db.js';

export const moveStage = async ({ prospectId, newStage, reason, userId }, db) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const [prospect] = await connection.query(
      `
      SELECT id
      FROM md_prospects
      WHERE id = ?
      `,
      [prospectId]
    );

    if (prospect.length === 0) {
      throw new Error('PROSPECT_NOT_FOUND');
    }
    await connection.query(
      `
      INSERT INTO td_prospect_stage_history
      (
        prospect_id,
        stage_code,
        reason_id,
        updated_by
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        prospectId,
        newStage,
        reason,
        userId
      ]
    );

    await connection.commit();

    return {
      success: true,
      prospectId,
      stage_code: newStage
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const transferProspects = async ({ prospectIds, assigned_to, assigned_by }, db) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    const prospect = Array.isArray(prospectIds) ? prospectIds : [prospectIds];
    const [row] = await connection.query(
      'UPDATE td_prospect_assignment SET assigned_to=?, assigned_by=? WHERE prospect_id IN (?)',
      [assigned_to, assigned_by, prospect]
    );
    await connection.commit();
    return { transferred: row.affectedRows };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const bulkInsertProspects = async (prospects, userId) => {
  const valuesProspects = [];
  const invalidProspects = [];
  const validProspects = [];
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    for (const p of prospects) {
      if (
        !p.email &&
        !p.phone &&
        !p.first_name &&
        !p.last_name &&
        !p.company_name
      ) {
        invalidProspects.push(p);
        continue;
      }

      validProspects.push(p);
      valuesProspects.push([
        p.company_name || null,
        p.first_name || null,
        p.last_name || null,
        p.job_title || null,
        p.email || null,        
        p.phone || null,        
        p.city || null,         
        p.state || null,        
        p.country || null,      
        p.industry_id || null,
        p.industry_size_id || null,
        p.website_url || null,
        p.source_id || null,
        p.referral_name || null,
        p.preferred_lang_id || 'EN',
        userId
      ]);
    }

    if (valuesProspects.length === 0) {
      await conn.rollback();
      conn.release();

      return {
        inserted: 0,
        skipped: prospects.length,
        invalid: invalidProspects.length
      };
    }

    // --- CHUNKING LOGIC STARTS HERE ---
    const BATCH_SIZE = 3100;
    let totalAffectedRows = 0;

    for (let i = 0; i < valuesProspects.length; i += BATCH_SIZE) {
      const chunk = valuesProspects.slice(i, i + BATCH_SIZE);

      const [prospectResult] = await conn.query(
        `
        INSERT INTO td_prospects (
            company_name,
            first_name,
            last_name,
            job_title,
            email,
            phone,
            city,
            state,
            country,
            industry_id,
            industry_size_id,
            website_url,
            source_id,
            referral_name,
            preferred_lang_id,
            updated_by
        )
        VALUES ?
        `,
        [chunk]
      );

      totalAffectedRows += prospectResult.affectedRows;
    }

    await conn.commit();
    conn.release();

    return {
      inserted: totalAffectedRows,
      skipped: prospects.length - totalAffectedRows - invalidProspects.length,
      invalid: invalidProspects.length
    };

  } catch (err) {
    await conn.rollback();
    conn.release();
    throw err;
  }
};

// export const processProspects = async () => {
//   let connection;

//   const valuesProspects = [];
//   const validProspects = [];
//   const validProspectMap = new Map();
//   const tdDuplicateMap = new Map();

//   try {
//     connection = await db.getConnection();
//     await connection.beginTransaction();

//     // STEP 1: Fetch md_prospects
//     const [masterRows] = await connection.query(`
//       SELECT
//         p.id,
//         p.email,
//         p.phone,
//         p.state,
//         p.city,
//         p.company_name,
//         p.website_url,
//         p.updated_by,
//         h.stage_code
//       FROM md_prospects p
//       LEFT JOIN td_prospect_stage_history h
//         ON h.id = (
//           SELECT sub.id
//           FROM td_prospect_stage_history sub
//           WHERE sub.prospect_id = p.id
//           ORDER BY sub.created_at DESC
//           LIMIT 1
//         )
//     `);

//     // STEP 2: Index md_prospects into ES
//     for (const master of masterRows) {
//       await indexProspect({
//         prospect_id: master.id,
//         email: master.email,
//         phone: master.phone,
//         company_name: master.company_name,
//         website_url:master.website_url,
//         city: master.city,
//         state: master.state,
//         updateBy: master.updated_by,
//         stage_code: master.stage_code
//       });
//     }

//     // STEP 3: Fetch td_prospects
//     const [queueRows] = await connection.query(`
//       SELECT
//         id,
//         first_name,
//         last_name,
//         job_title,
//         email,
//         phone,
//         company_name,
//         city,
//         state,
//         country,
//         industry_id,
//         industry_size_id,
//         website_url,
//         preferred_lang_id,
//         source_id,
//         referral_name,
//         updated_by
//       FROM td_prospects
//       where status = 1
//       ORDER BY id
//       LIMIT 350
//     `);
//     const ids = queueRows.map(row => row.id);
//     const placeholders = ids.map(() => '?').join(',');
//     await connection.query(
//         `
//         UPDATE td_prospects
//         SET status = 2
//         WHERE id IN (${placeholders})
//         `,
//         ids
//     );
//     if (!queueRows.length) {
//       await connection.commit();
//       return { inserted: 0, skipped: 0 };
//     }

//     const normalize = (v) => String(v || '').trim().toLowerCase();
//     const normalizePhone = (v) => String(v || '').replace(/\D/g, '');
//     for (const row of queueRows) {
//       //const key = `${row.email || ''}|${row.phone || ''}|${row.company_name || ''}`;
//       const key =`${normalize(row.email)}|`+`${normalizePhone(row.phone)}|`+`${normalize(row.company_name)}|`+`${normalize(row.city)}`;
//       const existsInElastic = await findDuplicate({
//         email: row.email,
//         phone: row.phone,
//         company_name: row.company_name,
//         website_url: row.website_url,
//         city: row.city,
//         state: row.state
//       });
//       const existsInValidProspects = validProspectMap.has(key);

//       if (existsInElastic || existsInValidProspects) {
//         if (tdDuplicateMap.has(key)) {
//           tdDuplicateMap.get(key).count += 1;
//         } else {
//           tdDuplicateMap.set(key, {
//             prospect_id: existsInElastic?.prospect_id || null,
//             email: existsInElastic?.email || row.email,
//             phone: existsInElastic?.phone || row.phone,
//             company_name: existsInElastic?.company_name || row.company_name,
//             website_url: existsInElastic?.website_url || row.website_url,
//             stage_status: existsInElastic?.stage_code || null,
//             update_by: existsInElastic?.updateBy || row.updated_by || null,
//             source_id: existsInElastic?.source_id || row.source_id || null,
//             count: 1
//           });
//         }
//       } else {
//         validProspectMap.set(key, true);

//         validProspects.push(row);

//         valuesProspects.push([
//           row.first_name || null,
//           row.last_name || null,
//           row.job_title || null,
//           row.email || null,
//           row.phone || null,
//           row.company_name || null,
//           row.city || null,
//           row.state || null,
//           row.country || null,
//           row.industry_id || null,
//           row.industry_size_id || null,
//           row.website_url || null,
//           row.preferred_lang_id || 'EN',
//           row.source_id || null,
//           row.referral_name || null,
//           row.updated_by || null
//         ]);
//       }
//     }

//     // STEP 5: Insert into md_prospects
//     let insertedCount = 0;
//     let firstInsertId = 0;

//     if (valuesProspects.length > 0) {
//       const [prospectResult] = await connection.query(`
//         INSERT IGNORE INTO md_prospects (
//           first_name,
//           last_name,
//           job_title,
//           email,
//           phone,
//           company_name,
//           city,
//           state,
//           country,
//           industry_id,
//           industry_size_id,
//           website_url,
//           preferred_lang_id,
//           source_id,
//           referral_name,
//           updated_by
//         ) VALUES ?
//       `, [valuesProspects]);

//       firstInsertId = prospectResult.insertId;
//       insertedCount = prospectResult.affectedRows;
//     }

//     // STEP 6: Assignment + Stage logs
//     const valuesAssignmentLogs = [];
//     const valuesStageLogs = [];

//     for (let i = 0; i < insertedCount; i++) {
//       const prospectId = firstInsertId + i;
//       const row = validProspects[i];

//       valuesAssignmentLogs.push([
//         prospectId,
//         null,
//         row.updated_by || null,
//         row.source_id || null
//       ]);

//       valuesStageLogs.push([
//         prospectId,
//         1,
//         null,
//         row.updated_by || null
//       ]);
//     }

//     // STEP 7: Insert assignment
//     if (valuesAssignmentLogs.length) {
//       await connection.query(`
//         INSERT INTO td_prospect_assignment (
//           prospect_id,
//           assigned_to,
//           assigned_by,
//           source_by
//         ) VALUES ?
//       `, [valuesAssignmentLogs]);
//     }

//     // STEP 8: Insert stage history
//     if (valuesStageLogs.length) {
//       await connection.query(`
//         INSERT INTO td_prospect_stage_history (
//           prospect_id,
//           stage_code,
//           reason_id,
//           updated_by
//         ) VALUES ?
//       `, [valuesStageLogs]);
//     }

//     // STEP 9: Insert duplicates
//     const duplicateValues = Array.from(tdDuplicateMap.values()).map(d => [
//       d.prospect_id,
//       d.email,
//       d.phone,
//       d.company_name,
//       d.website_url,
//       d.stage_status,
//       d.update_by,
//       d.source_id,
//       d.count
//     ]);

//     if (duplicateValues.length) {
//       await connection.query(`
//         INSERT INTO td_duplicate (
//           prospect_id,
//           email,
//           phone,
//           company_name,
//           website_url,
//           stage_status,
//           update_by,
//           source_id,
//           count
//         ) VALUES ?
//       `, [duplicateValues]);
//     }

//     // FINAL: commit
//     await connection.commit();

//     return {
//       inserted: insertedCount,
//       skipped: duplicateValues.length
//     };

//   } catch (err) {
//     if (connection) await connection.rollback();
//     throw err;
//   } finally {
//     if (connection) connection.release();
//   }
// };

// export const processProspect = async () => {
//   let connection;

//   const valuesProspects = [];
//   const validProspects = [];
//   const validProspectMap = new Map();
//   const tdDuplicateMap = new Map();

//   // Mutex to prevent concurrent map mutations during parallel processing
//   const normalize = (v) => String(v || '').trim().toLowerCase();
//   const normalizePhone = (v) => String(v || '').replace(/\D/g, '');

//   try {
//     connection = await db.getConnection();
//     await connection.beginTransaction();

//     // ─────────────────────────────────────────────────────────────
//     // STEP 1: Fetch md_prospects
//     // ─────────────────────────────────────────────────────────────
//     const [masterRows] = await connection.query(`
//       SELECT
//         p.id,
//         p.email,
//         p.phone,
//         p.state,
//         p.city,
//         p.company_name,
//         p.website_url,
//         p.updated_by,
//         h.stage_code
//       FROM md_prospects p
//       LEFT JOIN td_prospect_stage_history h
//         ON h.id = (
//           SELECT sub.id
//           FROM td_prospect_stage_history sub
//           WHERE sub.prospect_id = p.id
//           ORDER BY sub.created_at DESC
//           LIMIT 1
//         )
//     `);

//     // ─────────────────────────────────────────────────────────────
//     // STEP 2: Index md_prospects into ES — parallel batches
//     // ─────────────────────────────────────────────────────────────
//     for (let i = 0; i < masterRows.length; i += BATCH_SIZE) {
//       const batch = masterRows.slice(i, i + BATCH_SIZE);
//       await Promise.all(
//         batch.map((master) =>
//           indexProspect({
//             prospect_id:  master.id,
//             email:        master.email,
//             phone:        master.phone,
//             company_name: master.company_name,
//             website_url:  master.website_url,
//             city:         master.city,
//             state:        master.state,
//             updateBy:     master.updated_by,
//             stage_code:   master.stage_code,
//           })
//         )
//       );
//     }

//     // ─────────────────────────────────────────────────────────────
//     // STEP 3: Fetch td_prospects (status = 1) and immediately lock
//     //         them (status = 2) so concurrent runs can't grab them
//     // ─────────────────────────────────────────────────────────────
//     const [queueRows] = await connection.query(`
//       SELECT
//         id,
//         first_name,
//         last_name,
//         job_title,
//         email,
//         phone,
//         company_name,
//         city,
//         state,
//         country,
//         industry_id,
//         industry_size_id,
//         website_url,
//         preferred_lang_id,
//         source_id,
//         referral_name,
//         updated_by
//       FROM td_prospects
//       WHERE status = 1
//       ORDER BY id
//       LIMIT 350
//     `);

//     if (!queueRows.length) {
//       await connection.commit();
//       return { inserted: 0, skipped: 0 };
//     }

//     // Lock fetched rows immediately before any async work
//     const ids = queueRows.map((row) => row.id);
//     const placeholders = ids.map(() => '?').join(',');
//     await connection.query(
//       `UPDATE td_prospects SET status = 2 WHERE id IN (${placeholders})`,
//       ids
//     );

//     // ─────────────────────────────────────────────────────────────
//     // STEP 4: Duplicate check — parallel batches against ES
//     // ─────────────────────────────────────────────────────────────
//     for (let i = 0; i < queueRows.length; i += BATCH_SIZE) {
//       const batch = queueRows.slice(i, i + BATCH_SIZE);

//       // Run all ES lookups in this batch simultaneously
//       const results = await Promise.all(
//         batch.map((row) =>
//           findDuplicate({
//             email:        row.email,
//             phone:        row.phone,
//             company_name: row.company_name,
//             website_url:  row.website_url,
//             city:         row.city,
//             state:        row.state,
//           })
//         )
//       );

//       // Process results sequentially to avoid race conditions on shared Maps
//       for (let j = 0; j < batch.length; j++) {
//         const row = batch[j];
//         const existsInElastic = results[j];

//         const key =
//           `${normalize(row.email)}|` +
//           `${normalizePhone(row.phone)}|` +
//           `${normalize(row.company_name)}|` +
//           `${normalize(row.city)}`;

//         const existsInValidProspects = validProspectMap.has(key);

//         if (existsInElastic || existsInValidProspects) {
//           // ── Duplicate path ──────────────────────────────────────
//           if (tdDuplicateMap.has(key)) {
//             tdDuplicateMap.get(key).count += 1;
//           } else {
//             tdDuplicateMap.set(key, {
//               prospect_id:  existsInElastic?.prospect_id  || null,
//               email:        existsInElastic?.email        || row.email,
//               phone:        existsInElastic?.phone        || row.phone,
//               company_name: existsInElastic?.company_name || row.company_name,
//               website_url:  existsInElastic?.website_url  || row.website_url,
//               stage_status: existsInElastic?.stage_code   || null,
//               update_by:    existsInElastic?.updateBy     || row.updated_by || null,
//               source_id:    existsInElastic?.source_id    || row.source_id  || null,
//               count: 1,
//             });
//           }
//         } else {
//           // ── Valid prospect path ─────────────────────────────────
//           validProspectMap.set(key, true);
//           validProspects.push(row);
//           valuesProspects.push([
//             row.first_name        || null,
//             row.last_name         || null,
//             row.job_title         || null,
//             row.email             || null,
//             row.phone             || null,
//             row.company_name      || null,
//             row.city              || null,
//             row.state             || null,
//             row.country           || null,
//             row.industry_id       || null,
//             row.industry_size_id  || null,
//             row.website_url       || null,
//             row.preferred_lang_id || 'EN',
//             row.source_id         || null,
//             row.referral_name     || null,
//             row.updated_by        || null,
//           ]);
//         }
//       }
//     }

//     // ─────────────────────────────────────────────────────────────
//     // STEP 5: Bulk insert into md_prospects
//     // ─────────────────────────────────────────────────────────────
//     let insertedCount = 0;
//     let firstInsertId = 0;

//     if (valuesProspects.length > 0) {
//       const [prospectResult] = await connection.query(
//         `
//         INSERT IGNORE INTO md_prospects (
//           first_name,
//           last_name,
//           job_title,
//           email,
//           phone,
//           company_name,
//           city,
//           state,
//           country,
//           industry_id,
//           industry_size_id,
//           website_url,
//           preferred_lang_id,
//           source_id,
//           referral_name,
//           updated_by
//         ) VALUES ?
//         `,
//         [valuesProspects]
//       );

//       firstInsertId = prospectResult.insertId;
//       insertedCount = prospectResult.affectedRows;
//     }

//     // ─────────────────────────────────────────────────────────────
//     // STEP 6: Build assignment + stage log arrays
//     // ─────────────────────────────────────────────────────────────
//     const valuesAssignmentLogs = [];
//     const valuesStageLogs = [];

//     for (let i = 0; i < insertedCount; i++) {
//       const prospectId = firstInsertId + i;
//       const row = validProspects[i];

//       valuesAssignmentLogs.push([
//         prospectId,
//         null,
//         row.updated_by || null,
//         row.source_id  || null,
//       ]);

//       valuesStageLogs.push([
//         prospectId,
//         1,
//         null,
//         row.updated_by || null,
//       ]);
//     }

//     // ─────────────────────────────────────────────────────────────
//     // STEP 7: Bulk insert assignment logs
//     // ─────────────────────────────────────────────────────────────
//     if (valuesAssignmentLogs.length) {
//       await connection.query(
//         `
//         INSERT INTO td_prospect_assignment (
//           prospect_id,
//           assigned_to,
//           assigned_by,
//           source_by
//         ) VALUES ?
//         `,
//         [valuesAssignmentLogs]
//       );
//     }

//     // ─────────────────────────────────────────────────────────────
//     // STEP 8: Bulk insert stage history logs
//     // ─────────────────────────────────────────────────────────────
//     if (valuesStageLogs.length) {
//       await connection.query(
//         `
//         INSERT INTO td_prospect_stage_history (
//           prospect_id,
//           stage_code,
//           reason_id,
//           updated_by
//         ) VALUES ?
//         `,
//         [valuesStageLogs]
//       );
//     }

//     // ─────────────────────────────────────────────────────────────
//     // STEP 9: Bulk insert duplicates
//     // ─────────────────────────────────────────────────────────────
//     const duplicateValues = Array.from(tdDuplicateMap.values()).map((d) => [
//       d.prospect_id,
//       d.email,
//       d.phone,
//       d.company_name,
//       d.website_url,
//       d.stage_status,
//       d.update_by,
//       d.source_id,
//       d.count,
//     ]);

//     if (duplicateValues.length) {
//       await connection.query(
//         `
//         INSERT INTO td_duplicate (
//           prospect_id,
//           email,
//           phone,
//           company_name,
//           website_url,
//           stage_status,
//           update_by,
//           source_id,
//           count
//         ) VALUES ?
//         `,
//         [duplicateValues]
//       );
//     }

//     // ─────────────────────────────────────────────────────────────
//     // FINAL: Commit
//     // ─────────────────────────────────────────────────────────────
//     await connection.commit();

//     return {
//       inserted: insertedCount,
//       skipped:  duplicateValues.length,
//     };

//   } catch (err) {
//     if (connection) await connection.rollback();
//     throw err;
//   } finally {
//     if (connection) connection.release();
//   }
// };