const express = require('express');
const router = express.Router();
const Cost = require('../models/cost');
const Report = require('../models/report');
//const { pino: logger,logEvent } = require('../middlewares/logger');
const { pino: logger } = require('../middlewares/logger');

// const { pino: requestLogger } = require('../middlewares/logger');
/**
 * Endpoint: GET /api/total/:userid
 * Purpose: Helper for the User Process to calculate the 'total' field.
 */
router.get('/total/:userid', async (req, res) => {

    const { userid } = req.params;

    try {
        const result = await Cost.aggregate([
            { $match: { userid: parseInt(userid) } },
            { $group: { _id: null, total: { $sum: "$sum" } } }
        ]);

        const total = result.length > 0 ? result[0].total : 0;
        res.json({ userid: parseInt(userid), total:total });
    } catch (error) {
        res.status(500).json({ id: "server_error", message: error.message });
    }
});

/**
 * Endpoint: POST /api/add
 * Purpose: Adds a new cost item after validating the user exists.
 */
router.post('/add', async (req, res) => {
    const { userid, description, category, sum, year, month, day } = req.body;

    // 1. Validation for mandatory fields
    if (!userid || !description || !category || !sum) {
        return res.status(400).json({
            id: "validation_error",
            message: "userid, description, category, and sum are required."
        });
    }

    try {
        // 2. Inter-Process Communication: Verify User Exists
        // This calls your User Process (Process 2)
        const userApiUrl = process.env.USER_API_URL;
        const userCheck = await fetch(`${userApiUrl}/api/users/${userid}`);
      //  console.log('userCheck', userCheck);
        if (!userCheck.ok) {
            return res.status(404).json({
                id: "user_not_found",
                message: "Cost cannot be added: User does not exist."
            });
        }
       // console.log('userApiUrl', `${userApiUrl}/api/users/${userid}`);

        // 3. Create the Cost Item
        // If year/month/day aren't provided, server uses current time
        const createdAt = (year && month && day)
            ? new Date(year, month - 1, day)
            : new Date();

        const newCost = new Cost({
            userid,
            description,
            category,
            sum,
            createdAt
        });

        const savedCost = await newCost.save();
        //console.log('savedCost', savedCost);
       // await logEvent({ userid: req.body.userid }, "Cost item successfully saved to DB");
        logger.info({ userid: req.body.userid }, "Cost item successfully saved to DB");
        // 4. Log the access (Requirement: Pino + Log collection)
        // Note: The middleware usually handles general logs, but specific
        // endpoint logging is often done inside the logic for tracking successes.
     // pino.info({ userid, category, sum }, "New cost item added successfully");

        // Return JSON document describing the added item
        res.status(201).json(savedCost);

    } catch (error) {
        res.status(500).json({ id: "server_error", message: error.message });
    }
});
router.get('/report', async (req, res) => {
    const { id, year, month } = req.query;

    if (!id || !year || !month) {
        return res.status(400).json({ id: "error", message: "Missing id, year, or month parameters" });
    }

    try {
        // const userid = Number(id);
        const queryYear = parseInt(year);
        const queryMonth = parseInt(month);
        const userid=parseInt(id);

        // 1. Determine if the requested month has already passed
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed
        const isPastMonth = (parseInt(year) < currentYear) ||
            (parseInt(year) === currentYear && parseInt(month) < currentMonth);
      //  const isPastMonth = (queryYear < currentYear) || (queryYear === currentYear && queryMonth < currentMonth);


        // 2. If it's a past month, check the "computed" cache first
        if (isPastMonth) {
            console.log("Querying with:", {
                userid: typeof userid, // Should be 'number'
                year: typeof queryYear,
                month: typeof queryMonth
            });
           const   existingReport = await Report.findOne({ userid: userid, year:queryYear, month:queryMonth },  { _id: 0 });
           // console.log('existingReport search result:', existingReport);
            if (existingReport) {
                console.log('inside if  search result:', existingReport);
                return res.json(existingReport);// החזרת הדוח השמור
            }
          //  console.log('inside if  is past month result:', existingReport);
          }
        // if (existingReport) {
        //     return res.json(existingReport.data);// החזרת הדוח השמור
        // }
      //  console.log('we allready have report or month is not passed', isPastMonth);
        // 3. Compute the data (Needed for both current month and "missing" past reports)
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);


        const costs = await Cost.find({
            userid: userid,
            createdAt: { $gte: startDate, $lt: endDate }
        });

        // Grouping costs by category
        const categories = ['food', 'health', 'housing', 'sports', 'education'];
        const costsGrouped = categories.map(cat => {
            return {
                [cat]: costs
                    .filter(item => item.category === cat)
                    .map(item => ({
                        sum: item.sum,
                        description: item.description,
                        day: new Date(item.createdAt).getDate() // חילוץ היום בחודש
                    }))
            };
        });


        const reportData = {
            userid,
            year: queryYear,
            month: queryMonth,
            costs: costsGrouped
        };
        logger.info({ userid: userid }, "Generate report");
        // 4. Save to cache ONLY if the month has passed (The Computed Design Pattern)
        if (isPastMonth) {
            const newReport = new Report(reportData);
            await newReport.save();
        }

        // 5. Return the result
        res.json(reportData);

    } catch (error) {
        res.status(500).json({ id: "server_error", message: error.message });
    }
});

module.exports = router;