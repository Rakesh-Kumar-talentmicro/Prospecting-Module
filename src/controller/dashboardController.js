import * as dashboardService from '../service/dashboardService.js';

export const getDashboardTiles = async (req, res, next) => {
    try {
        const result = await dashboardService.getDashboardTiles();
        return res.json(result);
    } catch (err) {
        next(err);
    }
};

export const getBD = async (req, res, next) => {
    try {
        const result = await dashboardService.getBD();
        return res.json(result);
    } catch (err) {
        next(err);
    }
};

export const monthlyCT = async (req, res, next) => {
    try {
        const result = await dashboardService.monthlyCT();
        return res.json(result);
    } catch (err) {
        next(err);
    }
};

export const bdmonthlyCT = async (req, res, next) => {
    try {
        const result = await dashboardService.bdmonthlyCT();
        return res.json(result);
    } catch (err) {
        next(err);
    }
};