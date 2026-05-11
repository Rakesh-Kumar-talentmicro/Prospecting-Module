import express from 'express';
import * as controller from '../controller/messagesController.js';

const router = express.Router();

router.post('/sendBulk', controller.sendBulk);  // for Bulk send route
router.post('/sendSingle', controller.sendSingle);  // Single send route
router.get('/queue', controller.queue);  // Queue status route or status of prospects

router.post('/templates', controller.postTemplates); // Create template
router.put('/templates/:id', controller.updateTemplates); // Update template
router.get('/templates', controller.getTemplates); // List templates
// router.get('/health', controller.healthCheck);
export default router;


