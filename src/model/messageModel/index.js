
import { createTable as messageTemplates } from "./md_messages_templates.js";
//import { createTable as messageIndexes } from "./md_messages_indexes.js";
import { createTable as messageQueue } from "./td_messages_queue.js";
import { createTable as messageLog } from "./td_message_logs.js";
//import { createTable as enumTable} from "./md_message_enum.js";

export async function createMessageTables() {
  //await enumTable();
  await messageTemplates();
  await messageQueue();
  await messageLog();
  //await messageIndexes();

};