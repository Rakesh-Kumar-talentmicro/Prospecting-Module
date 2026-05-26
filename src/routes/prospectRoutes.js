import express from 'express';
import * as prospectController from '../controller/prospectController.js';
import { upload, parseExcelMiddleware } from '../middleware/excelParser.js';

const router = express.Router();

router.get('/countries', prospectController.getCountries); 
router.post('/uploadfile', upload.array('file'), parseExcelMiddleware, prospectController.uploadProspects);
router.post('/upload', prospectController.uploadProspects);
router.patch('/transfer', prospectController.transferProspects);
router.get('/', prospectController.listProspects);
router.get('/:id', prospectController.getProspect);
router.patch('/:id', prospectController.updateProspect);
router.patch('/:id/move-stage', prospectController.moveStage);
router.get('/:id/history', prospectController.getProspectHistory);

export default router;