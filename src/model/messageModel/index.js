
import { createTable as messageTemplates } from "./md_message_templates.js";
import { createTable as messageIndexes } from "./md_messages_indexes.js";
import { createTable as messageQueue } from "./td_messages_queue.js";
import { createTable as messageLog } from "./td_messges_log.js";


export async function createMessageTables() {
  await messageTemplates();
  await messageIndexes();
  await messageQueue();
  await messageLog();
}
