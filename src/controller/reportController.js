import * as reportService from '../service/reportService.js';

// GET /report/bd-activity
//     ?period=month
//     &bd_id=101
//     &fromDate=2026-01-01
//     &toDate=2026-01-31

export const getBdActivityReport =
  async (req, res, next) => {
    try {

      const {
        period = 'month',
        bd_id,
        fromDate,
        toDate
      } = req.query;

      const data =
        await reportService
          .getBdActivityReport({
            period,
            bd_id,
            fromDate,
            toDate
          });

      return res.status(200).json({
        success: true,
        data
      });

    } catch (err) {

      next(err);

    }
  };

// {
//   "success": true,
//   "data": {
//     "period": "month",
//     "currentPeriod": [
//       {
//         "bd_id": 101,
//         "activities": 520,
//         "attempted_prospects": 160,
//         "activities_per_prospect": 3.25,
//         "converted": 22,
//         "conversion_percentage": 13.75
//       }
//     ],
//     "previousYearSamePeriod": [
//       {
//         "bd_id": 101,
//         "activities": 410,
//         "attempted_prospects": 145,
//         "activities_per_prospect": 2.82,
//         "converted": 18,
//         "conversion_percentage": 12.41
//       }
//     ]
//   }
// }

export const getProspectSourcingReport = async (
    req,
    res,
    next
) => {

    try {

        const {
            period = 'month',
            bd_id,
            fromDate,
            toDate
        } = req.query;

        const data =
            await reportService
                .getProspectSourcingReport({
                    period,
                    bd_id,
                    fromDate,
                    toDate
                });

        return res.status(200).json({
            success: true,
            data
        });

    } catch (err) {

        next(err);

    }
};

// [
//   {
//     "bd_id": 101,
//     "period": "2026-01",
//     "sourced_prospects": 120
//   },
//   {
//     "bd_id": 101,
//     "period": "2026-02",
//     "sourced_prospects": 95
//   },
//   {
//     "bd_id": 102,
//     "period": "2026-02",
//     "sourced_prospects": 87
//   }
// ]