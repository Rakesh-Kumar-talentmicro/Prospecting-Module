import express from 'express';
import * as masterController from '../controller/master.controller.js';

const router = express.Router();

router.get('/', masterController.getMasterTables);

router.get('/stages', masterController.getStages);
router.post('/stages', masterController.saveMasterData);
router.get('/sources', masterController.getSources);
router.post('/sources', masterController.saveMasterData);
router.get('/languages', masterController.getLanguages);
router.post('/languages', masterController.saveMasterData);

router.get('/activity-status', masterController.getActivityStatus);
router.post('/activity-status', masterController.saveMasterData);
router.get('/activity-status-translated', masterController.getMasterData);
router.post('/activity-status-translated', masterController.saveMasterData);

router.get('/activity-type', masterController.getActivityTypes);
router.post('/activity-type', masterController.saveMasterData);

router.get('/industry-size', masterController.getIndustrySizes);
router.post('/industry-size', masterController.saveMasterData);
router.get('/industry-size-translated', masterController.getMasterData);
router.post('/industry-size-translated', masterController.saveMasterData);

router.get('/industry-types', masterController.getIndustryTypes);
router.post('/industry-types', masterController.saveMasterData);
router.get('/industry-types-translated', masterController.getMasterData);
router.post('/industry-types-translated', masterController.saveMasterData);

router.get('/reasons', masterController.getReasons);
router.post('/reasons', masterController.saveMasterData);
router.get('/reasons-translated', masterController.getMasterData);
router.post('/reasons-translated', masterController.saveMasterData);

router.get('/sources-translated', masterController.getMasterData);
router.post('/sources-translated', masterController.saveMasterData);
router.get('/stages-translation', masterController.getMasterData);
router.post('/stages-translation', masterController.saveMasterData);

router.get('/:masterName', masterController.getMasterData);
router.post('/:masterName', masterController.saveMasterData);

export default router;
