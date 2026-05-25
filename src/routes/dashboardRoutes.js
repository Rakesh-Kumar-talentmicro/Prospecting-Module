import express from 'express';
import * as dashboardController from '../controller/dashboardController.js';

const router = express.Router();

// Dashboard routes (specific paths first)
router.get('/tiles', dashboardController.getDashboardTiles);
router.get('/bd-summary', dashboardController.getBD);
router.get('/conversion-trend', dashboardController.monthlyCT);
router.get('/bd-conversion-trend', dashboardController.bdmonthlyCT);

export default router;