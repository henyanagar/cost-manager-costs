// Routes for cost endpoints
const express = require('express');
const router = express.Router();
const Cost = require('../models/cost');
const User = require('../models/user');
const Report = require('../models/report');
const { pino } = require('../middlewares/logger');
const { validateUserId, validateCategory, validateSum, validateYear, validateMonth } = require('../utils/validators');

// POST /api/add - add new cost item
router.post('/add', async (req, res) => {
    try {
        pino.info('Accessing POST /api/add endpoint');

        const { userid, description, category, sum } = req.body;

        // Validate required fields
        if (!userid || !description || !category || sum === undefined) {
            res.locals.errorId = 'VALIDATION_ERROR';
            return res.status(400).json({
                id: 'VALIDATION_ERROR',
                message: 'userid, description, category, and sum are required'
            });
        }

        // Validate user ID
        const useridValidation = validateUserId(userid);
        if (!useridValidation.isValid) {
            res.locals.errorId = 'INVALID_USERID';
            return res.status(400).json({
                id: 'INVALID_USERID',
                message: useridValidation.error
            });
        }

        const validUserId = useridValidation.value;

        // Validate category
        const categoryValidation = validateCategory(category);
        if (!categoryValidation.isValid) {
            res.locals.errorId = 'INVALID_CATEGORY';
            return res.status(400).json({
                id: 'INVALID_CATEGORY',
                message: categoryValidation.error
            });
        }

        // Validate sum
        const sumValidation = validateSum(sum);
        if (!sumValidation.isValid) {
            res.locals.errorId = 'INVALID_SUM';
            return res.status(400).json({
                id: 'INVALID_SUM',
                message: sumValidation.error
            });
        }

        const validSum = sumValidation.value;

        // Check if user exists directly in database
        const user = await User.findOne({ id: validUserId });
        if (!user) {
            res.locals.errorId = 'USER_NOT_FOUND';
            return res.status(404).json({
                id: 'USER_NOT_FOUND',
                message: 'User does not exist'
            });
        }

        // Always use current date - server timestamp ensures costs are added to current month only
        const newCost = await Cost.create({
            userid: validUserId,
            description: description.trim(),
            category: category,
            sum: validSum,
            createdAt: new Date()
        });

        pino.info(`Cost item successfully saved for user ${validUserId}`);
        res.status(201).json(newCost);

    } catch (error) {
        pino.error(`Error adding cost: ${error.message}`);
        res.status(500).json({
            id: 'SERVER_ERROR',
            message: 'Unable to add cost item'
        });
    }
});

// GET /api/report - get monthly report (Computed Design Pattern)
router.get('/report', async (req, res) => {
    try {
        pino.info('Accessing GET /api/report endpoint');

        const { id, year, month } = req.query;

        // Validate required parameters
        if (!id || !year || !month) {
            res.locals.errorId = 'VALIDATION_ERROR';
            return res.status(400).json({
                id: 'VALIDATION_ERROR',
                message: 'Missing id, year, or month parameters'
            });
        }

        // Validate user ID
        const useridValidation = validateUserId(id);
        if (!useridValidation.isValid) {
            res.locals.errorId = 'INVALID_ID';
            return res.status(400).json({
                id: 'INVALID_ID',
                message: useridValidation.error
            });
        }

        const userid = useridValidation.value;

        // Validate year
        const yearValidation = validateYear(year);
        if (!yearValidation.isValid) {
            res.locals.errorId = 'INVALID_YEAR';
            return res.status(400).json({
                id: 'INVALID_YEAR',
                message: yearValidation.error
            });
        }

        const queryYear = yearValidation.value;

        // Validate month
        const monthValidation = validateMonth(month);
        if (!monthValidation.isValid) {
            res.locals.errorId = 'INVALID_MONTH';
            return res.status(400).json({
                id: 'INVALID_MONTH',
                message: monthValidation.error
            });
        }

        const queryMonth = monthValidation.value;

        // Check if user exists before generating report
        const user = await User.findOne({ id: userid });
        if (!user) {
            res.locals.errorId = 'USER_NOT_FOUND';
            return res.status(404).json({
                id: 'USER_NOT_FOUND',
                message: 'User does not exist'
            });
        }

        /*
         * Computed Design Pattern Implementation:
         * For past months, check if a pre-calculated report exists in the database
         * If it exists, return it immediately (no need to recalculate)
         * If not, calculate it from the costs collection and save it for future requests
         * Current and future months are always calculated fresh (not cached)
         */
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const isPastMonth = (queryYear < currentYear) ||
            (queryYear === currentYear && queryMonth < currentMonth);

        // Check cache for past months
        if (isPastMonth) {
            const existingReport = await Report.findOne(
                { userid: userid, year: queryYear, month: queryMonth },
                { _id: 0, __v: 0 }
            );

            if (existingReport) {
                pino.info(`Returning cached report for user ${userid}`);
                return res.json(existingReport);
            }
        }

        // Compute the data from costs collection
        const startDate = new Date(queryYear, queryMonth - 1, 1);
        const endDate = new Date(queryYear, queryMonth, 1);

        const costs = await Cost.find({
            userid: userid,
            createdAt: { $gte: startDate, $lt: endDate }
        });

        // Group costs by category
        const categories = ['food', 'health', 'housing', 'sports', 'education'];
        const costsGrouped = categories.map((cat) => {
            return {
                [cat]: costs
                    .filter((item) => item.category === cat)
                    .map((item) => ({
                        sum: item.sum,
                        description: item.description,
                        day: new Date(item.createdAt).getDate()
                    }))
            };
        });

        const reportData = {
            userid: userid,
            year: queryYear,
            month: queryMonth,
            costs: costsGrouped
        };

        pino.info(`Generated report for user ${userid}`);

        // Save to cache only if the month has passed
        if (isPastMonth) {
            try {
                await Report.create(reportData);
                pino.info(`Cached report for user ${userid}`);
            } catch (err) {
                // If duplicate, just continue
                pino.warn(`Failed to cache report: ${err.message}`);
            }
        }

        res.json(reportData);

    } catch (error) {
        pino.error(`Error generating report: ${error.message}`);
        res.status(500).json({
            id: 'SERVER_ERROR',
            message: 'Unable to generate report'
        });
    }
});

module.exports = router;