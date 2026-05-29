import express from 'express';
import * as controller from '../controller/messagesController.js';

const router = express.Router();

router.post('/sendBulk', controller.sendBulk);
router.post('/sendSingle', controller.sendSingle);
router.post('/sendCustom', controller.sendCustom);
router.get('/queue', controller.queue);

router.post('/templates', controller.postTemplates);
router.put('/templates/:id', controller.updateTemplates);
router.get('/templates', controller.getTemplates); 
export default router;