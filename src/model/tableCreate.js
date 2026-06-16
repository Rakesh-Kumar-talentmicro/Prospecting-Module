import {createMasterTables} from "./masterModel/index.js";
import {createMessageTables} from "./messageModel/index.js";
import {createProspectTables} from "./prospectModel/index.js"; 

export async function createAllTable(){
    await createMasterTables();
    await createProspectTables();
    await createMessageTables();
    
};