import express from 'express';
import * as importController from '../controller/importController.js';
import { uploadProspectImportFile } from '../middleware/prospectImportUpload.js';

const router = express.Router();

router.post('/prospects', uploadProspectImportFile.single('file'), importController.uploadProspectImport);
router.get('/status/:uuid', importController.getProspectImportStatus);

export default router;
