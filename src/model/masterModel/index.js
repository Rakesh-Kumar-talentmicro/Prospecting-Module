import { createTable as createLanguagesTable } from "./md_languages.js";
import { createTable as createSourcesTable } from "./md_sources.js";
import { createTable as createStagesTable } from "./md_stages.js";
import { createTable as createStageTranslationsTable } from "./md_stages_translation.js";

export async function createMasterTables() {
  await createLanguagesTable();
  await createSourcesTable();
  await createStagesTable();
  await createStageTranslationsTable();
}

export {
  createLanguagesTable,
  createSourcesTable,
  createStagesTable,
  createStageTranslationsTable
};
