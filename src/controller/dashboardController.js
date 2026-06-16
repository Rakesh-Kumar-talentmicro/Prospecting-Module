import * as dashboardService from '../service/dashboardService.js';
import { normalizeInputData,normalizeOutputData } from '../utils/normalizeUtils.js';
import { prospectMapping } from '../model/prospectModel/prospectMapping.js';

export const getDashboardTiles = async (req, res, next) => {
    try {
        const result = await dashboardService.getDashboardTiles();
        return res.json(
            normalizeOutputData(
                [result],
                prospectMapping 
            )[0]
        );
    } catch (err) {
        next(err);
    }
};

export const getBD = async (req, res, next) => {
    try {
        const result = await dashboardService.getBD();
        return res.json(normalizeOutputData(result,prospectMapping));
    } catch (err) {
        next(err);
    }
};

export const monthlyCT = async (req, res, next) => {
    try {
        const result =
            await dashboardService.monthlyCT();

        return res.json(
            normalizeOutputData(
                result,
                prospectMapping
            )
        );
    } catch (err) {
        next(err);
    }
};

export const bdmonthlyCT = async (req, res, next) => {
    try {
        const result = await dashboardService.bdmonthlyCT();
        return res.json(
            normalizeOutputData(
                result,
                prospectMapping
            )
        );
    } catch (err) {
        next(err);
    }
};