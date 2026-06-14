import { createMasterTables } from "../model/masterModel/index.js";
import { createMessageTables } from "../model/messageModel/index.js";
import { createProspectTables } from "../model/prospectModel/index.js";

export async function createAllTable(){
    await createMasterTables();
    await createProspectTables();
    await createMessageTables();
}
