import express from 'express';
import * as prospectController from '../controller/prospectController.js';
import { upload, parseExcelMiddleware } from '../middleware/excelParser.js';
import db from '../config/db.js';

const router = express.Router();

// Upload routes
router.post('/uploadfile', upload.array('file'), parseExcelMiddleware, prospectController.uploadProspects);
router.post('/upload', prospectController.uploadProspects);

// Transfer route
router.patch('/transfer', prospectController.transferProspects); 

// Prospect routes
router.get('/', prospectController.listProspects);  
router.get('/:id/history', prospectController.getProspectHistory); 
router.patch('/:id/move-stage', prospectController.moveStage); 
router.get('/:id', prospectController.getProspect);
router.patch('/:id', prospectController.updateProspect);

export default router;
