import { createTable as messageTemplates } from "./md_message_templates.js";
import { createTable as messageQueue } from "./td_message_queue.js";
import { createTable as messageLog } from "./td_messge_logs.js";


export async function createMessageTables() {
  await messageTemplates();
  await messageQueue();
  await messageLog();
}

