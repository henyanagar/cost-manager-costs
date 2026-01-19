// Pino logger middleware
// Logs every HTTP request locally and to logs service
const pino = require('pino')();

// Middleware to log every HTTP request
const requestLogger = async (req, res, next) => {
    // Wait for response to finish to get status code
    res.on('finish', async () => {
        const logData = {
            service: 'costs-service',
            level: res.statusCode >= 400 ? 'error' : 'info',
            msg: `${req.method} ${req.originalUrl} - ${res.statusCode}`,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            time: Date.now()
        };

        // Local log for console
        pino.info(logData.msg);

        // Remote log to Logs API database
        try {
            const logApiUrl = `${process.env.LOG_API_URL}/api/logs/add`;
            if (logApiUrl) {
                await fetch(logApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(logData)
                });
            }
        } catch (err) {
            // Fallback if Logs API is down
            pino.error(`Remote log failed: ${err.message}`);
        }
    });

    next();
};

module.exports = {
    requestLogger,
    pino
};