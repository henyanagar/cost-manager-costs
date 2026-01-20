// Routes for cost endpoints
const express = require('express');
const router = express.Router();
const Cost = require('../models/cost');
const User = require('../models/user');
const Report = require('../models/report');
const { pino } = require('../middlewares/logger');

// Define allowed categories (matching requirements exactly)
const VALID_CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

// POST /api/add - add new cost item
router.post('/add', async (req, res) => {
    try {
        const { userid, description, category, sum, year, month, day } = req.body;

        // Validation for mandatory fields
        if (!userid || !description || !category || sum === undefined) {
            res.locals.errorId = 'VALIDATION_ERROR';
            return res.status(400).json({
                id: 'VALIDATION_ERROR',
                message: 'userid, description, category, and sum are required'
            });
        }

        // Category validation
        if (!VALID_CATEGORIES.includes(category)) {
            res.locals.errorId = 'INVALID_CATEGORY';
            return res.status(400).json({
                id: 'INVALID_CATEGORY',
                message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
            });
        }

        // Check if user exists directly in database
        const user = await User.findOne({ id: userid });
        if (!user) {
            res.locals.errorId = 'USER_NOT_FOUND';
            return res.status(404).json({
                id: 'USER_NOT_FOUND',
                message: 'User does not exist'
            });
        }

        // Create the cost item
        const createdAt = (year && month && day)
            ? new Date(year, month - 1, day)
            : new Date();

        const newCost = await Cost.create({
            userid: userid,
            description: description,
            category: category,
            sum: sum,
            createdAt: createdAt
        });

        pino.info(`Cost item successfully saved for user ${userid}`);
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
        const { id, year, month } = req.query;

        // Validation
        if (!id || !year || !month) {
            res.locals.errorId = 'VALIDATION_ERROR';
            return res.status(400).json({
                id: 'VALIDATION_ERROR',
                message: 'Missing id, year, or month parameters'
            });
        }

        const userid = parseInt(id);
        const queryYear = parseInt(year);
        const queryMonth = parseInt(month);

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

        // Group costs by category (exactly as in requirements)
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