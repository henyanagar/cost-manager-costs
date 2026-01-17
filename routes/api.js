
const pino = require('pino');
const logger = pino({
    level: 'info',
    // במידת הצורך ניתן להוסיף transport כדי לכתוב לקובץ או ל-DB
});

const express = require('express');
const router = express.Router();
const Cost = require('../models/cost');
const User = require('../models/user');
const Report = require('../models/report');
const Log = require('../models/log'); // מודל לתיעוד לוגים ב-DB

// אנדפוינט להוספת פריט עלות חדש
router.post('/addOld', async (req, res) => {
    // שליפת הנתונים מהגוף של הבקשה
    const { userid, description, category, sum, createdAt } = req.body;

    // בדיקה ראשונית שכל שדות החובה קיימים (Validation)
    if (!userid || !description || !category || !sum) {
        return res.status(400).json({
            id: 'validation_error',
            message: 'All fields (userid, description, category, sum) are required.'
        });
    }

    try {
        // תיעוד הבקשה ב-Log כפי שנדרש (כל בקשת HTTP חייבת להירשם)
        await Log.create({
            method: 'POST',
            endpoint: '/api/add',
            params: req.body,
            timestamp: new Date()
        });

        // בדיקה האם המשתמש קיים במערכת לפני הוספת עלות
        const userExists = await User.findOne({ id: userid });
        if (!userExists) {
            return res.status(404).json({
                id: 'user_not_found',
                message: 'The specified userid does not exist.'
            });
        }

        // יצירת אובייקט העלות החדש
        // אם לא נשלח תאריך, המערכת תשתמש בתאריך הנוכחי כברירת מחדל
        const newCost = new Cost({
            userid,
            description,
            category,
            sum,
            createdAt: createdAt || new Date()
        });

        // שמירת העלות בבסיס הנתונים
        const savedCost = await newCost.save();

        // החזרת תשובה בפורמט JSON כפי שנדרש
        res.status(201).json(savedCost);

    } catch (error) {
        // טיפול בשגיאות ותיעודן
        console.error('Error adding cost:', error);
        res.status(500).json({
            id: 'server_error',
            message: 'An error occurred while adding the cost item.'
        });
    }
});
router.post('/add', async (req, res) => {
    try {
        const { userid, description, category, sum, createdAt } = req.body;

        // 1. הגדרת זמן נוכחי (תחילת החודש הנוכחי)
        // קביעת התאריך הסופי: מה שנשלח, או "עכשיו"
        const finalDate = createdAt ? new Date(createdAt) : new Date();

        // חישוב תחילת החודש הנוכחי
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // חסימת הוספה לחודשי עבר (גם אם נשלח תאריך וגם אם יש סטיית זמן בשרת)
        if (finalDate < startOfCurrentMonth) {
            return res.status(400).json({
                id: 'invalid_date',
                message: 'Cannot add costs to past months.'
            });
        }



        // 3. תיעוד לוג ב-DB (כרגיל) TODO CHANGE TO LOGAPI WITH PROMISE
        await Log.create({
            action: 'Add Cost',
            method: 'POST',
            endpoint: '/api/add',
            params: req.body
        });

        // 4. בדיקת קיום משתמש // 3. תיעוד לוג ב-DB (כרגיל) TODO CHANGE TO USERSAPI WITH PROMISE
        const user = await User.findOne({ id: userid });
        if (!user) {
            return res.status(404).json({ id: 'not_found', message: 'User not found' });
        }

        // 5. שמירת העלות
        const newCost = new Cost({
            userid,
            description,
            category,
            sum,
            createdAt: createdAt || new Date() // אם לא נשלח, משתמשים בעכשיו
        });

        const savedCost = await newCost.save();
        res.json(savedCost);

    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});
// 2. אנדפוינט דוח חודשי - GET /api/report (עם Computed Pattern)
// אנדפוינט לקבלת דו"ח חודשי
router.get('/report', async (req, res) => {
    const { id, year, month } = req.query;
// validation

    if (!id && !year && !month) {
        return res.status(400).json({
            id: 'VALIDATION_ERROR',
            message: 'Missing required parameters'
        });
    }
    let totalForUser=0
//calculate total only  by id
    if (!year && !month) {
        totalForUser=  calculateReportForUser(id);
        return  res.json((await totalForUser).total);
    }


    // קבלת התאריך הנוכחי
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth מחזיר 0-11

    // בדיקה האם מדובר בחודש מהעבר
    const isPastMonth = (parseInt(year) < currentYear) ||
        (parseInt(year) === currentYear && parseInt(month) < currentMonth);

    try {
        // שלב 1: רק אם זה חודש מהעבר, נחפש דוח מוכן (Computed Pattern)
        if (isPastMonth) {
            const existingReport = await Report.findOne({ userid: id, year, month });
            if (existingReport) {
                return res.json(existingReport.data);// החזרת הדוח השמור
            }
        }

        // שלב ב': חישוב הדוח מהעלויות הגולמיות (costs)
        // זה קורה תמיד עבור חודש נוכחי, או פעם ראשונה עבור חודש עבר
        const reportData = await calculateReport(id, year, month);

        // שלב 3: שמירה ל-DB רק אם זה חודש מהעבר
        // שלב ג': שמירה לשימוש עתידי רק אם זה חודש עבר
        if (isPastMonth) {
            await Report.create({
                userid: id,
                year,
                month,
                data: reportData
            });
        }

        // שלב ד': החזרת התשובה למשתמש
        res.json(reportData);

    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});
router.get('/reportOld', async (req, res) => {
    // שליפת הפרמטרים מה-URL (Query String)
    const { id, year, month } = req.query;

    if (!id || !year || !month) {
        return res.status(400).json({
            id: 'missing_params',
            message: 'Please provide id, year and month in the query string'
        });
    }

    try {
    await Log.create({ action: 'Get Report', method: 'GET', endpoint: '/api/report', params: req.query });


    /* C-style block comment:
       Implementation of the Computed Design Pattern.
       We first check if a report for this specific user, month, and year
       already exists in our 'reports' collection to avoid redundant calculations.
    */
   // try {
        // 1. חיפוש דוח קיים
        const existingReport = await Report.findOne({ userid: id, year, month });
        if (existingReport) {
            return res.json(existingReport.data);
        }
        console.log('no report');
        // 2. אם לא קיים - שליפת כל העלויות של המשתמש לאותו חודש
        const costs = await Cost.find({
            userid: id,
            // לוגיקה למציאת תאריכים בטווח החודש המבוקש
            createdAt: {
                $gte: new Date(year, month - 1, 1),
                $lt: new Date(year, month, 1)
            }
        });
        console.log(costs)
        // 3. חלוקה לקטגוריות לפי הפורמט שנדרש
        const categories = ["food", "health", "housing", "sports", "education"];
        const groupedCosts = categories.map(cat => {
            return {
                [cat]: costs
                    .filter(c => c.category === cat)
                    .map(c => ({
                        sum: c.sum,
                        description: c.description,
                        day: new Date(c.createdAt).getDate()
                    }))
            };
        });

        const reportData = {
            userid: parseInt(id),
            year: parseInt(year),
            month: parseInt(month),
            costs: groupedCosts
        };

        // 4. שמירת הדוח המחושב לשימוש עתידי (Computed Pattern)
        const newReport = new Report({
            userid: id,
            year,
            month,
            data: reportData
        });
        await newReport.save();

        res.json(reportData);

    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});

//calculate total for user
async function calculateReportForUser(userId) {

    // שליפת כל העלויות של המשתמש בחודש זה
    const costs = await Cost.find({
        userid: userId
    });
    console.log('ddd' +costs.length);
    const totalSum = costs.reduce((acc, item) => acc + (Number(item.sum) || 0), 0);
    console.log('totalSum' +totalSum);
    // החזרת האובייקט הסופי בדיוק לפי הדוגמה במסמך
    return {
        userid: parseInt(userId),
        total: totalSum
    };
}
// פונקציה עזר לחישוב וארגון הנתונים לפי פורמט המרצה
async function calculateReport(userId, year, month) {
    // הגדרת טווח התאריכים של החודש המבוקש
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // שליפת כל העלויות של המשתמש בחודש זה
    const costs = await Cost.find({
        userid: userId,
        createdAt: { $gte: startDate, $lt: endDate }
    });

    // רשימת הקטגוריות שחייבות להופיע בדו"ח לפי הדרישות
    const categories = ["food", "health", "housing", "sports", "education"];

    /* מיפוי העלויות למבנה הנדרש:
       עבור כל קטגוריה, נסנן את העלויות השייכות אליה ונשמור רק את השדות הנדרשים.
    */
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

    // החזרת האובייקט הסופי בדיוק לפי הדוגמה במסמך
    return {
        userid: parseInt(userId),
        year: parseInt(year),
        month: parseInt(month),
        costs: costsGrouped
    };
}
/*
router.get('/report', async (req, res) => {

    try {
        const { id, year, month } = req.query;
        await Log.create({ action: 'Get Report', method: 'GET', endpoint: '/api/report', params: req.query });

       // C-style comment:
       //    Checking the 'reports' collection first. If found, return stored data.
       //    This is the core of the Computed Design Pattern.

        const existingReport = await Report.findOne({ userid: id, year, month });
        if (existingReport) return res.json(existingReport.data);

        // חישוב מחדש אם לא נמצא (כפי שכתבנו קודם)
        // ... (קוד החישוב מההודעה הקודמת) ...

    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});*/
module.exports = router;
 /*


router.post('/add', async function(req, res) {
    try {
        const description = req.body.description;
        const category = req.body.category;
        const userid = Number(req.body.userid);
        const sum = Number(req.body.sum);

        // Validation בסיסי (המסמך + Q&A אומרים שכן צריך validation)
        if (typeof description !== 'string' || description.length === 0) {
            console.log('description is required');
           // return errorJson(res, 400, 4001, 'description is required');
        }
        if (typeof category !== 'string' || category.length === 0) {
            console.log('category is required');

           // return errorJson(res, 400, 4002, 'category is required');
        }
        if (!Number.isFinite(userid)) {
            const exists = await userExists(userid);
            if (!exists) {
                await sendLog('error', 'userid does not exist', { userid: userid });
                return res.status(400).json({ id: 4007, message: 'userid does not exist' });
            }
            console.log('userid must be a number');
           // return errorJson(res, 400, 4003, 'userid must be a number');
        }
        if (!Number.isFinite(sum)) {
            console.log('sum must be a number');
            //return errorJson(res, 400, 4004, 'sum must be a number');

        }

        const saved = await Cost.create({
            description: description,
            category: category,
            userid: userid,
            sum: sum
        });
        // לוג הצלחה (endpoint accessed)
        await sendLog('info', 'cost added', { costId: saved._id, userid: userid });
        return res.json(saved);
    } catch (err) {
        await sendLog('error', 'failed to add cost', { message: err.message });
       // console.log('failed to add cost-{0}',err.id);
       // return errorJson(res, 500, 5001, err.message || err.id || 'failed to add cost');
    }
});
async function userExists(userid) {
    const url = process.env.USERS_BASE_URL + '/api/users/' + userid;
    const resp = await fetch(url, { method: 'GET' });
    return resp.status === 200;
}
async function sendLog(level, message, extra) {
    const base = process.env.LOGS_BASE_URL;
    if (!base) return;

    try {
        await fetch(base + '/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service: 'costs',
                level: level,                 // 'info' | 'error' וכו'
                message: message,
                time: new Date().toISOString(),
                extra: extra || {}
            })
        });
    } catch (e) {
        // חשוב: לא מפילים את הבקשה בגלל שנפל שירות הלוגים
    }
}
*/
module.exports = router;
