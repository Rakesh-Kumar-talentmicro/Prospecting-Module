import * as reportService from '../service/reportService.js';

const getReportQuery = (req) => ({
  period:   req.query.period   || req.query.groupBy,
  fromDate: req.query.fromDate || req.query.from_date,
  toDate:   req.query.toDate   || req.query.to_date,
  bdId:     req.query.bdId     || req.query.bd_id
});

export const getBdActivityReport = async (req, res, next) => {
  try {
    const data = await reportService.getBdActivityReport(getReportQuery(req));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// {
//   "bdId": 42,
//   "periodLabel": "2025-Q1",
//   "activities": 120,
//   "attemptedProspects": 40,
//   "convertedProspects": 10,
//   "conversionPercentage": 25.00,
//   "previousYear": {
//     "periodLabel": "2024-Q1",
//     "activities": 90,
//     "attemptedProspects": 30,
//     "convertedProspects": 6,
//     "conversionPercentage": 20.00
//   }
// }

export const getProspectSourcingReport = async (req, res, next) => {
  try {
    const data = await reportService.getProspectSourcingReport(getReportQuery(req));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// {
//   "bdId": 42,
//   "periodLabel": "2025-Q1",
//   "sourcedProspects": 35,
//   "previousYear": {
//     "periodLabel": "2024-Q1",
//     "sourcedProspects": 28
//   }
// }