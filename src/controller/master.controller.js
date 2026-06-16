import * as masterService from '../service/master.service.js';
import {encryptPayload} from "../utils/securityLayer.js";

const DEFAULT_LANGUAGE_ID = 'EN';

const normalizeLanguageId = (languageId) => {
  if (!languageId || typeof languageId !== 'string') {
    return DEFAULT_LANGUAGE_ID;
  }

  return languageId.trim().toUpperCase() || DEFAULT_LANGUAGE_ID;
};

const sendData = (res, data) => {
  return res.status(200).json({ success: true, data });
};

const getMasterName = (req) => {
  return req.params.masterName || req.path.replace(/^\/+/, '');
};

export const getMasterTables = async (req, res, next) => {
  try {
    return sendData(res, masterService.listMasterTables());
  } catch (err) {
    next(err);
  }
};

export const getMasterData = async (req, res, next) => {
  try {
    const data = await masterService.getMasterData(getMasterName(req));
    return sendData(res, data);
  } catch (err) {
    next(err);
  }
};

export const saveMasterData = async (req, res, next) => {
  try {
    const data = await masterService.upsertMasterData(getMasterName(req), req.body);
    return sendData(res, data);
  } catch (err) {
    next(err);
  }
};

export const getStages = async (req, res, next) => {
  try {
    const lang = normalizeLanguageId(req.query.lang);
    const data = await masterService.getStages(lang);
    return sendData(res, data);
  } catch (err) {
    next(err);
  }
};

export const getSources = async (req, res, next) => {
  try {
    const lang = normalizeLanguageId(req.query.lang);
    const data = await masterService.getSources(lang);
    return sendData(res, data);
  } catch (err) {
    next(err);
  }
};

export const getLanguages = async (req, res, next) => {
  try {
    const data = await masterService.getLanguages();
    // const data = encryptPayload(
    //   dataByDb
    // );
    return sendData(res, data);
  } catch (err) {
    next(err);
  }
};

export const getActivityStatus = async (req, res, next) => {
  try {
    const lang = normalizeLanguageId(req.query.lang);
    const data = await masterService.getActivityStatus(lang);
    return sendData(res, data);
  } catch (err) {
    next(err);
  }
};

export const getActivityTypes = async (req, res, next) => {
  try {
    const data = await masterService.getActivityTypes();
    return sendData(res, data);
  } catch (err) {
    next(err);
  }
};

export const getIndustrySizes = async (req, res, next) => {
  try {
    const lang = normalizeLanguageId(req.query.lang);
    const data = await masterService.getIndustrySizes(lang);
    return sendData(res, data);
  } catch (err) {
    next(err);
  }
};

export const getIndustryTypes = async (req, res, next) => {
  try {
    const lang = normalizeLanguageId(req.query.lang);
    const data = await masterService.getIndustryTypes(lang);
    return sendData(res, data);
  } catch (err) {
    next(err);
  }
};

export const getReasons = async (req, res, next) => {
  try {
    const lang = normalizeLanguageId(req.query.lang);
    const data = await masterService.getReasons(lang);
    return sendData(res, data);
  } catch (err) {
    next(err);
  }
};
