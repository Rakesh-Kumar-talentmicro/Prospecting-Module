import * as masterService from '../service/master.service.js';

const DEFAULT_LANGUAGE_ID = 'EN';

const normalizeLanguageId = (languageId) => {
  if (!languageId || typeof languageId !== 'string') {
    return DEFAULT_LANGUAGE_ID;
  }

  return languageId.trim().toUpperCase() || DEFAULT_LANGUAGE_ID;
};

export const getStages = async (req, res, next) => {
  try {
    const lang = normalizeLanguageId(req.query.lang);
    const data = await masterService.getStages(lang);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

export const getSources = async (req, res, next) => {
  try {
    const data = await masterService.getSources();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

export const getLanguages = async (req, res, next) => {
  try {
    const data = await masterService.getLanguages();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};
