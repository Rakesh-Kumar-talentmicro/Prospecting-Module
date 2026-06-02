import express from 'express';
import * as importController from '../controller/importController.js';

const router = express.Router();

router.get('/status/:uuid', importController.getProspectImportStatus);

export default router;
