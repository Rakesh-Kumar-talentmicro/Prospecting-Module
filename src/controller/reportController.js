import * as reportService from '../service/reportService.js';

const getReportQuery = (req) => ({
  period: req.query.period || req.query.groupBy,
  fromDate: req.query.fromDate || req.query.from_date,
  toDate: req.query.toDate || req.query.to_date,
  bdName: req.query.bdName || req.query.bd_name
});

export const getBdActivityReport = async (req, res, next) => {
  try {
    const data = await reportService.getBdActivityReport(getReportQuery(req));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getProspectSourcingReport = async (req, res, next) => {
  try {
    const data = await reportService.getProspectSourcingReport(getReportQuery(req));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
