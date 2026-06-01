import express from 'express';
import * as prospectController from '../controller/prospectController.js';
import { upload, parseExcelMiddleware } from '../middleware/excelParser.js';

const router = express.Router();

// Upload routes
router.post('/uploadfile', upload.array('file'), parseExcelMiddleware, prospectController.uploadProspects);
router.post('/upload', prospectController.uploadProspects);

// Transfer route
router.patch('/transfer', prospectController.transferProspects);

// Prospect routes
router.get('/', prospectController.listProspects);
router.post('/', prospectController.createProspect);
router.get('/:id/history', prospectController.getProspectHistory);
router.patch('/:id/move-stage', prospectController.moveStage);
router.get('/:id', prospectController.getProspect);
router.patch('/:id', prospectController.updateProspect);

// Activity routes
router.post('/:id/activity', prospectController.createActivity);
router.post('/:id/call', prospectController.createCallActivity);
router.get('/:id/activity', prospectController.listActivities);
router.patch('/:id/activity/:activityId', prospectController.updateActivity);
router.patch('/:id/activity/:activityId/success', prospectController.closeActivity);
router.patch('/:id/activity/:activityId/cancel', prospectController.cancelActivity);

export default router;