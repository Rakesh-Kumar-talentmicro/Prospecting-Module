import * as importService from '../service/prospectImportService.js';

export const uploadProspectImport = async (req, res, next) => {
  try {
    const uploadedBy = req.headers['user-id'] || null;

    const result = await importService.startProspectImport({
      file:       req.file,
      importUUID: req.body?.importUUID || req.body?.uuid || req.headers['import-uuid'] || null,
      uploadedBy,
    });

    return res.status(result.existing ? 200 : 202).json({
      uuid:   result.uuid,
      status: result.status,
    });
  } catch (err) {
    next(err);
  }
};

export const getProspectImportStatus = async (req, res, next) => {
  try {
    const status = await importService.getImportStatus(req.params.uuid);
    return res.json(status);
  } catch (err) {
    next(err);
  }
};
