import { spawn } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';
import db from '../src/config/db.js';

const runId = Date.now();
const testDomain = 'codex-api-test.local';
const userId = 91001;
const adminId = 91002;
const results = [];
const createdProspectIds = new Set();
const createdNoteIds = new Set();
const testReasonId = 900000 + (runId % 100000);

let baseUrl = '';
let serverProcess = null;
let masterData = {};
let serverStdout = '';
let serverStderr = '';
let primaryProspectId = null;
let parkedProspectId = null;
let primaryActivityId = null;
let callActivityId = null;

const repeatToLength = (prefix, fill, maxLength) => {
  if (prefix.length >= maxLength) {
    return prefix.slice(0, maxLength);
  }

  return prefix + fill.repeat(maxLength - prefix.length);
};

const maxEmail = () => {
  const suffix = `-${runId}@${testDomain}`;
  const localLength = 255 - suffix.length;
  return `${'e'.repeat(localLength)}${suffix}`;
};

const jsonHeaders = () => ({
  'content-type': 'application/json',
  'user-id': String(userId),
  'admin-id': String(adminId),
  'bd-name': `Codex BD ${runId}`
});

const findFreePort = () => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForServer = async () => {
  const deadline = Date.now() + 15000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/masters`);
      if (response.ok) {
        await response.text();
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }

    await wait(250);
  }

  throw new Error(`Server did not become ready: ${lastError?.message || 'timeout'}`);
};

const startServer = async () => {
  const port = await findFreePort();
  baseUrl = `http://127.0.0.1:${port}`;

  serverProcess = spawn(process.execPath, ['index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (chunk) => {
    serverStdout += chunk.toString();
  });
  serverProcess.stderr.on('data', (chunk) => {
    serverStderr += chunk.toString();
  });

  serverProcess.once('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      process.stderr.write(`[server] exited with code ${code}\n`);
      process.stderr.write(serverStderr);
    }
  });

  await waitForServer();
};

const stopServer = async () => {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  serverProcess.kill();
  await wait(500);
};

const readJson = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async (method, path, { body, expectedStatus } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: jsonHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await readJson(response);

  if (expectedStatus !== undefined && response.status !== expectedStatus) {
    throw new Error(`${method} ${path} expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`);
  }

  return { status: response.status, data };
};

const expect = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const expectStatusIn = (actual, allowed, message) => {
  if (!allowed.includes(actual)) {
    throw new Error(`${message}: expected one of ${allowed.join(', ')}, got ${actual}`);
  }
};

const record = async (name, fn) => {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`PASS ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', message: err.message });
    console.error(`FAIL ${name}: ${err.message}`);
  }
};

const cleanupProspectIds = async (ids) => {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (!uniqueIds.length) {
    return;
  }

  await db.query('DELETE FROM notes WHERE prospect_id IN (?)', [uniqueIds]);
  await db.query('DELETE FROM td_activity WHERE prospect_id IN (?)', [uniqueIds]);
  await db.query('DELETE FROM td_stage_logs WHERE prospect_id IN (?)', [uniqueIds]);
  await db.query('DELETE FROM td_transfer_logs WHERE prospect_id IN (?)', [uniqueIds]);
  await db.query('DELETE FROM td_prospect_update_logs WHERE prospect_id IN (?)', [uniqueIds]);
  await db.query('DELETE FROM md_prospects WHERE id IN (?)', [uniqueIds]);
};

const cleanup = async () => {
  const [staleProspects] = await db.query(
    'SELECT id FROM md_prospects WHERE email LIKE ? OR company_name LIKE ?',
    [`%@${testDomain}`, 'Codex API Test%']
  );
  const staleIds = staleProspects.map((row) => row.id);
  await cleanupProspectIds([...createdProspectIds, ...staleIds]);

  if (createdNoteIds.size > 0) {
    await db.query('DELETE FROM notes WHERE note_id IN (?)', [[...createdNoteIds]]);
  }

  await db.query('DELETE FROM md_reasons_translated WHERE reason_id = ?', [testReasonId]);
  await db.query('DELETE FROM md_reasons WHERE reason_id = ?', [testReasonId]);
};

const loadMasterData = async () => {
  const [stages] = await db.query('SELECT stage_code, stage_key, seq, progress FROM md_stages ORDER BY COALESCE(seq, stage_code), stage_code');
  const [reasons] = await db.query('SELECT reason_id, reason_title FROM md_reasons ORDER BY reason_id');
  const [activityTypes] = await db.query('SELECT activity_type_id, activity_type_title FROM md_activity_type ORDER BY activity_type_id');
  const [activityStatuses] = await db.query('SELECT activity_id, activity_title FROM md_activity_status ORDER BY COALESCE(seq, activity_id), activity_id');
  const [sources] = await db.query('SELECT source_id, source_key FROM md_sources ORDER BY source_id');
  const [industryTypes] = await db.query('SELECT industry_id FROM md_industry_types ORDER BY industry_id');
  const [industrySizes] = await db.query('SELECT industry_size_id FROM md_industry_size ORDER BY industry_size_id');

  masterData = {
    stages,
    reasons,
    activityTypes,
    activityStatuses,
    sources,
    industryTypes,
    industrySizes,
    stageByKey: Object.fromEntries(stages.map((stage) => [stage.stage_key, stage])),
    sourceByKey: Object.fromEntries(sources.map((source) => [source.source_key, source])),
    activityTypeByTitle: Object.fromEntries(activityTypes.map((type) => [type.activity_type_title, type]))
  };
};

const minMaxId = (rows, field) => ({
  min: rows[0]?.[field],
  max: rows[rows.length - 1]?.[field]
});

const createPrimaryProspectBody = () => {
  const industry = minMaxId(masterData.industryTypes, 'industry_id');
  const size = minMaxId(masterData.industrySizes, 'industry_size_id');

  return {
    companyName: repeatToLength('Codex API Test Company ', 'C', 255),
    contactName: repeatToLength('Codex Contact ', 'N', 255),
    jobTitle: repeatToLength('Chief Test Officer ', 'J', 255),
    emailAddress: maxEmail(),
    phoneNumber: repeatToLength('', '9', 50),
    linkedinUrl: repeatToLength('https://example.com/linkedin/', 'l', 255),
    twitterUrl: repeatToLength('https://example.com/twitter/', 't', 255),
    facebookUrl: repeatToLength('https://example.com/facebook/', 'f', 255),
    instagramUrl: repeatToLength('https://example.com/instagram/', 'i', 255),
    industryId: industry.max,
    industrySizeId: size.max,
    sourceId: masterData.sourceByKey.DIRECT.source_id,
    sourcedDate: '1970-01-01T00:00:00.000Z',
    assignedTo: 2147483647,
    notes: repeatToLength('Boundary notes ', 'x', 4096),
    followUpDate: '2099-12-31T23:59:59.000Z',
    preferred_lang_id: 'EN'
  };
};

const createParkedProspectBody = () => {
  const industry = minMaxId(masterData.industryTypes, 'industry_id');
  const size = minMaxId(masterData.industrySizes, 'industry_size_id');

  return {
    companyName: `Codex API Test Parked ${runId}`,
    contactName: 'Parked Contact',
    emailAddress: `parked-${runId}@${testDomain}`,
    phoneNumber: '1000000000',
    industryId: industry.min,
    industrySizeId: size.min,
    sourceId: masterData.sourceByKey.REFERRAL.source_id,
    referralName: repeatToLength('Referral Source ', 'R', 255),
    stageCode: masterData.stageByKey.PARKED.stage_code,
    reasonId: masterData.reasons[0].reason_id,
    sourcedDate: '2038-01-19T03:14:07.000Z'
  };
};

const requireMasterFixtures = () => {
  ['PENDING', 'ATTEMPTED', 'ENGAGED', 'CONVERTED', 'PARKED'].forEach((key) => {
    expect(masterData.stageByKey[key], `Missing stage ${key}`);
  });
  expect(masterData.reasons.length > 0, 'No reasons are seeded');
  expect(masterData.sourceByKey.DIRECT, 'Missing DIRECT source');
  expect(masterData.sourceByKey.REFERRAL, 'Missing REFERRAL source');
  expect(masterData.activityTypeByTitle.Call, 'Missing Call activity type');
  expect(masterData.activityTypes.length > 1, 'Need at least two activity types');
  expect(masterData.industryTypes.length > 0, 'No industry types are seeded');
  expect(masterData.industrySizes.length > 0, 'No industry sizes are seeded');
};

const main = async () => {
  try {
    await cleanup();
    await loadMasterData();
    requireMasterFixtures();
    await startServer();

    await record('DB stage invariants after migration', async () => {
      expect(masterData.stages.length === 5, `Expected 5 stages, got ${masterData.stages.length}`);
      expect(JSON.stringify(masterData.stages.map((stage) => [stage.stage_key, stage.progress])) === JSON.stringify([
        ['PENDING', 0],
        ['ATTEMPTED', 30],
        ['ENGAGED', 60],
        ['CONVERTED', 100],
        ['PARKED', -100]
      ]), 'Stage key/progress mismatch');

      const [[parkedWithoutReason]] = await db.query(
        'SELECT COUNT(*) AS count FROM md_prospects WHERE stage_code = ? AND reason_id IS NULL',
        [masterData.stageByKey.PARKED.stage_code]
      );
      const [[nonParkedWithReason]] = await db.query(
        'SELECT COUNT(*) AS count FROM md_prospects WHERE stage_code <> ? AND reason_id IS NOT NULL',
        [masterData.stageByKey.PARKED.stage_code]
      );
      expect(parkedWithoutReason.count === 0, `Parked prospects without reason: ${parkedWithoutReason.count}`);
      expect(nonParkedWithReason.count === 0, `Non-Parked prospects with reason: ${nonParkedWithReason.count}`);
    });

    const masterGetPaths = [
      '/masters',
      '/masters/stages?lang=EN',
      '/masters/sources?lang=EN',
      '/masters/languages',
      '/masters/activity-status?lang=EN',
      '/masters/activity-status-translated',
      '/masters/activity-type',
      '/masters/industry-size?lang=EN',
      '/masters/industry-size-translated',
      '/masters/industry-types?lang=EN',
      '/masters/industry-types-translated',
      '/masters/reasons?lang=EN',
      '/masters/reasons-translated',
      '/masters/sources-translated',
      '/masters/stages-translation'
    ];

    for (const path of masterGetPaths) {
      await record(`GET ${path}`, async () => {
        const { data } = await request('GET', path, { expectedStatus: 200 });
        expect(data?.success === true || Array.isArray(data), `${path} did not return success data`);
      });
    }

    await record('GET /masters/stages exposes 5-stage metadata', async () => {
      const { data } = await request('GET', '/masters/stages?lang=EN', { expectedStatus: 200 });
      const stages = data.data;
      expect(stages.length === 5, `Expected 5 API stages, got ${stages.length}`);
      const parked = stages.find((stage) => stage.stage_key === 'PARKED');
      const converted = stages.find((stage) => stage.stage_key === 'CONVERTED');
      expect(parked?.progress === -100, 'Parked progress should be -100');
      expect(Number(parked?.requires_reason) === 1, 'Parked should require reason');
      expect(Number(parked?.is_terminal) === 1, 'Parked should be terminal');
      expect(Number(converted?.is_terminal) === 1, 'Converted should be terminal');
      expect(!stages.some((stage) => ['CONTACTED', 'INTERESTED', 'QUALIFIED', 'DROPPED', 'HOLD', 'DEFERRED'].includes(stage.stage_key)), 'Legacy stages leaked in API');
    });

    await record('POST /masters/reasons max-length insert and cleanup target', async () => {
      const title = repeatToLength('Codex Test Reason ', 'R', 100);
      const { data } = await request('POST', '/masters/reasons', {
        expectedStatus: 200,
        body: {
          reason_id: testReasonId,
          reason_title: title,
          lang_id: 'EN'
        }
      });
      expect(data?.success === true, 'Reason upsert did not return success');
      const [[row]] = await db.query('SELECT reason_title FROM md_reasons WHERE reason_id = ?', [testReasonId]);
      expect(row?.reason_title === title, 'Reason row was not inserted with max-length title');
    });

    await record('POST /masters/reasons-translated insert', async () => {
      const { data } = await request('POST', '/masters/reasons-translated', {
        expectedStatus: 200,
        body: {
          reason_id: testReasonId,
          lang_id: 'EN',
          translated_title: 'Codex Test Reason Translation'
        }
      });
      expect(data?.success === true, 'Reason translation upsert did not return success');
    });

    await record('GET missing master table returns 404', async () => {
      const { status } = await request('GET', '/masters/not-a-master');
      expectStatusIn(status, [404], 'Missing master status');
    });

    await record('POST prospect rejects Referral without referralName', async () => {
      const body = {
        companyName: `Codex API Test Bad Referral ${runId}`,
        emailAddress: `bad-referral-${runId}@${testDomain}`,
        sourceId: masterData.sourceByKey.REFERRAL.source_id
      };
      const { status } = await request('POST', '/prospects', { body });
      expectStatusIn(status, [400], 'Referral without referralName');
    });

    await record('POST prospect rejects reason on non-Parked stage', async () => {
      const body = {
        companyName: `Codex API Test Bad Reason ${runId}`,
        emailAddress: `bad-reason-${runId}@${testDomain}`,
        sourceId: masterData.sourceByKey.DIRECT.source_id,
        stageCode: masterData.stageByKey.PENDING.stage_code,
        reasonId: masterData.reasons[0].reason_id
      };
      const { status } = await request('POST', '/prospects', { body });
      expectStatusIn(status, [400], 'Reason on non-Parked stage');
    });

    await record('POST prospect rejects Parked without reason', async () => {
      const body = {
        companyName: `Codex API Test Bad Parked ${runId}`,
        emailAddress: `bad-parked-${runId}@${testDomain}`,
        sourceId: masterData.sourceByKey.DIRECT.source_id,
        stageCode: masterData.stageByKey.PARKED.stage_code
      };
      const { status } = await request('POST', '/prospects', { body });
      expectStatusIn(status, [400], 'Parked without reason');
    });

    await record('POST prospect accepts max/min boundary fields', async () => {
      const { data } = await request('POST', '/prospects', {
        expectedStatus: 201,
        body: createPrimaryProspectBody()
      });
      expect(data?.success === true, 'Create prospect did not return success');
      primaryProspectId = data.data.prospectId;
      createdProspectIds.add(primaryProspectId);
      expect(data.data.stageCode === masterData.stageByKey.PENDING.stage_code, 'Default stage should be Pending');
      expect(data.data.reasonId === null, 'Pending prospect should not have a reason');
    });

    await record('POST prospect accepts Parked with reason and Referral', async () => {
      const { data } = await request('POST', '/prospects', {
        expectedStatus: 201,
        body: createParkedProspectBody()
      });
      parkedProspectId = data.data.prospectId;
      createdProspectIds.add(parkedProspectId);
      expect(data.data.stageCode === masterData.stageByKey.PARKED.stage_code, 'Parked prospect stage mismatch');
      expect(data.data.reasonId === masterData.reasons[0].reason_id, 'Parked prospect reason mismatch');
    });

    await record('GET and list prospects with min/high pagination filters', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const getOne = await request('GET', `/prospects/${primaryProspectId}`, { expectedStatus: 200 });
      expect(getOne.data.prospectId === primaryProspectId, 'GET prospect id mismatch');

      const minList = await request('GET', `/prospects?last_id=0&limit=1&stage_code=${masterData.stageByKey.PENDING.stage_code}`, { expectedStatus: 200 });
      expect(Array.isArray(minList.data.prospects), 'List response should contain prospects array');

      const highList = await request('GET', '/prospects?last_id=9223372036854775000&limit=1000', { expectedStatus: 200 });
      expect(Array.isArray(highList.data.prospects), 'High list response should contain prospects array');
      expect(highList.data.prospects.length === 0, 'High last_id should return no rows');
    });

    await record('PATCH prospect update rejects reason on Engaged', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const { status } = await request('PATCH', `/prospects/${primaryProspectId}`, {
        body: {
          stageCode: masterData.stageByKey.ENGAGED.stage_code,
          reasonId: masterData.reasons[0].reason_id
        }
      });
      expectStatusIn(status, [400], 'Update reason on Engaged');
    });

    await record('PATCH prospect update accepts long note and future date', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const { data } = await request('PATCH', `/prospects/${primaryProspectId}`, {
        expectedStatus: 200,
        body: {
          notes: repeatToLength('Updated boundary note ', 'u', 8192),
          followUpDate: '2099-12-31T23:59:59.000Z'
        }
      });
      expect(data?.success === true, 'Prospect update did not return success');
    });

    await record('PATCH move-stage rejects Parked without reason', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const { status } = await request('PATCH', `/prospects/${primaryProspectId}/move-stage`, {
        body: {
          stageCode: masterData.stageByKey.PARKED.stage_code
        }
      });
      expectStatusIn(status, [400], 'Move to Parked without reason');
    });

    await record('PATCH move-stage rejects invalid reason', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const { status } = await request('PATCH', `/prospects/${primaryProspectId}/move-stage`, {
        body: {
          stageCode: masterData.stageByKey.PARKED.stage_code,
          reasonId: 2147483647
        }
      });
      expectStatusIn(status, [400], 'Move to Parked with invalid reason');
    });

    await record('PATCH move-stage accepts stage aliases and Parked reason', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const { data } = await request('PATCH', `/prospects/${primaryProspectId}/move-stage`, {
        expectedStatus: 200,
        body: {
          stage_code: masterData.stageByKey.PARKED.stage_code,
          reason_id: masterData.reasons[1]?.reason_id || masterData.reasons[0].reason_id
        }
      });
      expect(data.success === true, 'Move to Parked did not return success');
      expect(data.to === masterData.stageByKey.PARKED.stage_code, 'Move to Parked target mismatch');
      expect(data.reasonId, 'Move to Parked should return reasonId');
    });

    await record('PATCH move-stage clears reason when returning to Attempted', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      await request('PATCH', `/prospects/${primaryProspectId}/move-stage`, {
        expectedStatus: 200,
        body: {
          newStage: masterData.stageByKey.ATTEMPTED.stage_code
        }
      });
      const { data } = await request('GET', `/prospects/${primaryProspectId}`, { expectedStatus: 200 });
      expect(data.stageCode === masterData.stageByKey.ATTEMPTED.stage_code, 'Attempted stage mismatch after move');
      expect(data.reasonId === null, 'Reason should clear when leaving Parked');
    });

    await record('PATCH transfer prospect updates assignment', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const { data } = await request('PATCH', '/prospects/transfer', {
        expectedStatus: 200,
        body: {
          prospectIds: [primaryProspectId],
          toUserId: 91003
        }
      });
      expect(data.transferred === 1, 'Transfer count mismatch');
      const { data: prospect } = await request('GET', `/prospects/${primaryProspectId}`, { expectedStatus: 200 });
      expect(prospect.assignedTo === 91003, 'Transfer did not update assigned user');
    });

    await record('POST activity rejects invalid prospect and missing type', async () => {
      const invalidProspect = await request('POST', '/prospects/0/activity', {
        body: {
          activityTypeId: masterData.activityTypes[0].activity_type_id
        }
      });
      expectStatusIn(invalidProspect.status, [400], 'Invalid prospect id');

      const missingType = await request('POST', `/prospects/${primaryProspectId}/activity`, {
        body: {}
      });
      expectStatusIn(missingType.status, [400], 'Missing activity type');
    });

    await record('POST activity rejects invalid next action and date', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const invalidNextAction = await request('POST', `/prospects/${primaryProspectId}/activity`, {
        body: {
          activityTypeId: masterData.activityTypes[0].activity_type_id,
          nextActionTypeId: 2147483647
        }
      });
      expectStatusIn(invalidNextAction.status, [404], 'Invalid next action type');

      const invalidDate = await request('POST', `/prospects/${primaryProspectId}/activity`, {
        body: {
          activityTypeId: masterData.activityTypes[0].activity_type_id,
          nextActionAt: 'not-a-date'
        }
      });
      expectStatusIn(invalidDate.status, [400], 'Invalid next action date');
    });

    await record('POST activity accepts max outcome, attachments, and next action', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const nextType = masterData.activityTypes.find((type) => type.activity_type_id !== masterData.activityTypes[0].activity_type_id);
      const { data } = await request('POST', `/prospects/${primaryProspectId}/activity`, {
        expectedStatus: 201,
        body: {
          activityTypeId: masterData.activityTypes[0].activity_type_id,
          outcome: repeatToLength('Outcome ', 'o', 255),
          activityNotes: repeatToLength('Activity notes ', 'a', 4096),
          attachmentPaths: [
            repeatToLength('/tmp/codex-attachment-', 'p', 255),
            ''
          ],
          nextActionTypeId: nextType.activity_type_id,
          nextActionAt: '2099-12-31T23:59:59.000Z'
        }
      });
      expect(data.success === true, 'Create activity did not return success');
      primaryActivityId = data.data.t_id;
      expect(data.data.activity_status_title === 'Pending', 'New activity should be Pending');
      expect(data.data.outcome?.length === 255, 'Outcome should round-trip at max length');
      expect(data.data.action_links?.email?.startsWith('mailto:'), 'Activity should include email action link');
      expect(data.data.action_links?.call?.startsWith('tel:'), 'Activity should include call action link');
    });

    await record('POST call activity creates Call activity', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const { data } = await request('POST', `/prospects/${primaryProspectId}/call`, {
        expectedStatus: 201,
        body: {
          outcome: 'Call started',
          activityNotes: 'Created through call shortcut'
        }
      });
      callActivityId = data.data.t_id;
      expect(data.data.activity_type_title === 'Call', 'Call shortcut did not create Call activity');
    });

    await record('GET activities returns created activity and action links', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const { data } = await request('GET', `/prospects/${primaryProspectId}/activity`, { expectedStatus: 200 });
      expect(Array.isArray(data.data), 'Activity list should be an array');
      expect(data.data.some((activity) => activity.t_id === primaryActivityId), 'Primary activity missing from list');
      expect(data.data.every((activity) => activity.action_links), 'Activity action links missing');
    });

    await record('PATCH activity updates outcome after activity', async () => {
      expect(primaryActivityId, 'Primary activity was not created');
      const { data } = await request('PATCH', `/prospects/${primaryProspectId}/activity/${primaryActivityId}`, {
        expectedStatus: 200,
        body: {
          outcome: 'Updated after activity outcome',
          activityNotes: 'Updated notes after activity',
          attachmentPaths: '/tmp/single-attachment.txt'
        }
      });
      expect(data.data.outcome === 'Updated after activity outcome', 'Activity outcome was not updated');
      expect(data.data.activity_notes === 'Updated notes after activity', 'Activity notes were not updated');
    });

    await record('PATCH activity success closes with final outcome', async () => {
      expect(primaryActivityId, 'Primary activity was not created');
      const { data } = await request('PATCH', `/prospects/${primaryProspectId}/activity/${primaryActivityId}/success`, {
        expectedStatus: 200,
        body: {
          outcome: 'Converted after successful activity'
        }
      });
      expect(data.data.activity_status_title === 'Closed', 'Success endpoint should close activity');
      expect(data.data.outcome === 'Converted after successful activity', 'Close outcome mismatch');
    });

    await record('PATCH activity cancel marks call activity Cancelled', async () => {
      expect(callActivityId, 'Call activity was not created');
      const { data } = await request('PATCH', `/prospects/${primaryProspectId}/activity/${callActivityId}/cancel`, {
        expectedStatus: 200,
        body: {
          outcome: 'Cancelled after no answer'
        }
      });
      expect(data.data.activity_status_title === 'Cancelled', 'Cancel endpoint should cancel activity');
    });

    await record('GET prospect history includes stage and update logs', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const { data } = await request('GET', `/prospects/${primaryProspectId}/history`, { expectedStatus: 200 });
      expect(Array.isArray(data.stageLogs), 'History stageLogs should be array');
      expect(Array.isArray(data.transferLogs), 'History transferLogs should be array');
      expect(Array.isArray(data.updateLogs), 'History updateLogs should be array');
      expect(data.stageLogs.length >= 2, 'Expected at least two stage logs');
      expect(data.updateLogs.length >= 1, 'Expected at least one update log');
    });

    await record('POST notes rejects empty and accepts long note with attachment', async () => {
      expect(primaryProspectId, 'Primary prospect was not created');
      const empty = await request('POST', '/notes', {
        body: {
          prospect_id: primaryProspectId,
          note_text: '',
          created_by: String(userId)
        }
      });
      expectStatusIn(empty.status, [400], 'Empty note');

      const { data } = await request('POST', '/notes', {
        expectedStatus: 201,
        body: {
          prospect_id: primaryProspectId,
          note_text: repeatToLength('Long note ', 'n', 8192),
          created_by: String(userId),
          attachment_paths: repeatToLength('/tmp/note-attachment-', 'n', 255)
        }
      });
      createdNoteIds.add(data.data.id);
      expect(data.success === true, 'Create note did not return success');

      const notes = await request('GET', `/notes/${primaryProspectId}`, { expectedStatus: 200 });
      expect(notes.data.data.some((note) => note.note_id === data.data.id), 'Created note missing from list');
    });
  } finally {
    await stopServer();
    await cleanup();
    await db.end();
  }

  const failures = results.filter((result) => result.status === 'FAIL');
  if (failures.length > 0) {
    console.error('\nServer stdout');
    console.error(serverStdout.trim() || '(empty)');
    console.error('\nServer stderr');
    console.error(serverStderr.trim() || '(empty)');
  }

  console.log('\nSummary');
  console.log(JSON.stringify({
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    failures
  }, null, 2));

  if (failures.length > 0) {
    process.exit(1);
  }
};

main().catch(async (err) => {
  console.error(`Fatal test harness error: ${err.stack || err.message}`);
  try {
    await stopServer();
    await cleanup();
    await db.end();
  } catch (cleanupErr) {
    console.error(`Cleanup error: ${cleanupErr.stack || cleanupErr.message}`);
  }
  process.exit(1);
});
