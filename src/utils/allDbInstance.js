import { createMasterTables } from "../model/masterModel";
import { createMessageTables } from "../model/messageModel";

export async function createAllTable(){
    await createMasterTables();
    await createMessageTables();
}
