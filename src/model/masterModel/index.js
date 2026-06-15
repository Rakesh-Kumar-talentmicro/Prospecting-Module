import { createTable as createActivityStatusTable } from "./md_activity_status.js";
import { createTable as createActivityStatusTranslatedTable } from "./md_activity_status_translated.js";
import { createTable as createActivityTypeTable } from "./md_activity_type.js";
import { createTable as createIndustrySizeTable } from "./md_industry_size.js";
import { createTable as createIndustrySizeTranslatedTable } from "./md_industry_size_translated.js";
import { createTable as createIndustryTypesTable } from "./md_industry_types.js";
import { createTable as createIndustryTypesTranslatedTable } from "./md_industry_types_translated.js";
import { createTable as createLanguagesTable } from "./md_languages.js";
import { createTable as createReasonsTable } from "./md_reasons.js";
import { createTable as createReasonsTranslatedTable } from "./md_reasons_translated.js";
import { createTable as createSourcesTable } from "./md_sources.js";
import { createTable as createSourcesTranslatedTable } from "./md_sources_translated.js";
import { createTable as createStagesTable } from "./md_stages.js";
import { createTable as createStageTranslationsTable } from "./md_stages_translation.js";

export async function createMasterTables() {
  await createActivityStatusTable();
  await createActivityTypeTable();
  await createIndustrySizeTable();
  await createIndustryTypesTable();
  await createLanguagesTable();
  await createReasonsTable();
  await createSourcesTable();
  await createStagesTable();
  await createActivityStatusTranslatedTable();
  await createIndustrySizeTranslatedTable();
  await createIndustryTypesTranslatedTable();
  await createReasonsTranslatedTable();
  await createSourcesTranslatedTable();
  await createStageTranslationsTable();
}

// export {
//   createActivityStatusTable,
//   createActivityStatusTranslatedTable,
//   createActivityTypeTable,
//   createIndustrySizeTable,
//   createIndustrySizeTranslatedTable,
//   createIndustryTypesTable,
//   createIndustryTypesTranslatedTable,
//   createLanguagesTable,
//   createReasonsTable,
//   createReasonsTranslatedTable,
//   createSourcesTable,
//   createSourcesTranslatedTable,
//   createStagesTable,
//   createStageTranslationsTable
// };
