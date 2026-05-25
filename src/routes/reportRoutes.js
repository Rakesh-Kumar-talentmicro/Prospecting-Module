import express from 'express';
import * as reportController from '../controller/reportController.js';

const router = express.Router();

router.get('/bd-activity', reportController.getBdActivityReport);
router.get('/prospect-sourcing', reportController.getProspectSourcingReport);

export default router;
