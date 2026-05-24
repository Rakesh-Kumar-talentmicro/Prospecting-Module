import express from 'express';
import * as prospectController from '../controller/prospectController.js';
import { upload, parseExcelMiddleware } from '../middleware/excelParser.js';

const router = express.Router();

router.post('/upload', upload.array('file'), parseExcelMiddleware, prospectController.uploadProspects);
router.patch('/transfer', prospectController.transferProspects);
router.get('/', prospectController.listProspects);
router.post('/', prospectController.createProspect);
router.get('/:id', prospectController.getProspect);
router.patch('/:id', prospectController.updateProspect);
router.patch('/:id/move-stage', prospectController.moveStage);
router.get('/:id/history', prospectController.getProspectHistory);
router.post('/:id/activity', prospectController.createActivity);
router.post('/:id/call', prospectController.createCallActivity);
router.get('/:id/activity', prospectController.listActivities);
router.patch('/:id/activity/:activityId', prospectController.updateActivity);
router.patch('/:id/activity/:activityId/success', prospectController.closeActivity);
router.patch('/:id/activity/:activityId/cancel', prospectController.cancelActivity);

export default router;
