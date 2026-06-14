import client from '../config/redisClient.js'
import db from '../config/db.js';
const batchingProcessing = async ({ }) => {
    // batch 2000 comes over here and while iterating each records assign as rows

    const normalize = (v) => String(v || '').trim().toLowerCase();
    const normalizePhone = (v) => String(v || '').replace(/\D/g, '');

    const CustomKey_for_repetation = (row) => `prospect:${normalize(row.email)}|` + `${normalizePhone(row.phone)}|` + `${normalize(row.company_name)}|` + `${normalize(row.userId)}`;
    const CustomKey = (row) => `prospect:${normalize(row.email)}|` + `${normalizePhone(row.phone)}|` + `${normalize(row.company_name)}`;
    // ── STEP B: In-memory dedupe + count sync ───────────────────
    const store_prospects = new Map();

    for(const row of batch){
        const key = CustomKey(row);
        const repetation = CustomKey_for_repetation(row);
        if(store_prospects.has(repetation)){
            store_prospects.get(repetation).count +=1;
            continue;
        }
        let obj = {...row,count:1,key:key};
        store_prospects.set(repetation,obj);
    }


    const tdProspectsValues = [...store_prospects.values()].map((row) => [
        row.key,
        row.first_name || null,
        row.last_name || null,
        row.job_title || null,
        row.email || null,
        row.phone || null,
        row.company_name || null,
        row.city || null,
        row.state || null,
        row.country || null,
        row.industry_id || null,
        row.industry_size_id || null,
        row.website_url || null,
        row.preferred_lang_id || 'EN',
        row.source_id || null,
        row.referral_name || null,
        userId || null,      //  ---> this is basically authentication part -- req.header['userId']
        row.count,
        1
    ]);

    const conn2 = await db.getConnection();
    try {
        await conn2.beginTransaction();

        if (tdProspectsValues.length) {
            await conn2.query(
            `INSERT INTO td_prospects (
            prospect_key,
            first_name,
            last_name,
            job_title,
            email,
            phone,
            company_name,
            city,
            state,
            country,
            industry_id,
            industry_size_id,
            website_url,
            preferred_lang_id,
            source_id,
            referral_name,
            source_bd_id,
            duplicate_count,
            status
            ) VALUES ?`,
            [tdProspectsValues.map((v) => [ ...v]),]
        );
        }
        await conn2.commit();
    } catch (err) {
        await conn2.rollback();
        throw err;
    } finally {
        conn2.release();
    }
}
