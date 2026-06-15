import { createTable as assignTable } from "./td_prospect_assignment.js";
import { createTable as duplicatetable } from "./td_duplicate.js";
import { createTable as prospectTable } from "./md_prospects.js";
import { createTable as stageHistoryTable } from "./td_prospect_stage_history.js";
import { createTable as updateLogTable } from "./update_logs.js";
import { createTable as activityTable } from "./activity.js";
import { createTable as noteTable} from "../notesModel/td_notes.js";

export async function createProspectTables() {
    await assignTable();
    await duplicatetable();
    await prospectTable();
    await stageHistoryTable();
    await updateLogTable();
    await activityTable();
    await noteTable();
};
