import { createTable as createProspectsTable } from "./prospects.js";
import { createTable as createStageLogsTable } from "./stage_logs.js";
import { createTable as createTransferLogsTable } from "./transfer_logs.js";
import { createTable as createActivityTable } from "./activity.js";
import { createTable as createUpdateLogsTable } from "./update_logs.js";
import { prospectMapping } from "./prospectMapping.js";

export async function createProspectTables() {
    await createProspectsTable();
    await createStageLogsTable();
    await createTransferLogsTable();
    await createActivityTable();
    await createUpdateLogsTable();
}

export {
    createProspectsTable,
    createStageLogsTable,
    createTransferLogsTable,
    createActivityTable,
    createUpdateLogsTable,
    prospectMapping
};
