const pino = require('pino')();

const requestLogger = async (req, res, next) => {
    const logData = {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        timestamp: new Date()
    };

    // Log to console using Pino
    pino.info(logData, `Request received for ${req.url}`);

    // Send to Log Process (Process 1)
    try {
        const logApiUrl = process.env.LOG_API_URL || 'http://localhost:3001';
     /*   await fetch(`${logApiUrl}/api/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });*/
    } catch (err) {
        pino.error("Failed to send log to Log Process", err.message);
    }

    next();
};

module.exports = requestLogger;