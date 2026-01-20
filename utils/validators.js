// Validation functions for cost-related operations
'use strict';

// Valid categories as per requirements
const VALID_CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

/**
 * Validate user ID
 * @param {any} userid - User ID to validate
 * @returns {object} - { isValid: boolean, error: string|null, value: number|null }
 */
function validateUserId(userid) {
    if (userid === undefined || userid === null) {
        return {
            isValid: false,
            error: 'User ID is required',
            value: null
        };
    }

    const userId = Number(userid);

    if (!Number.isInteger(userId) || userId <= 0) {
        return {
            isValid: false,
            error: 'User ID must be a positive integer',
            value: null
        };
    }

    return {
        isValid: true,
        error: null,
        value: userId
    };
}

/**
 * Validate cost category
 * @param {string} category - Category to validate
 * @returns {object} - { isValid: boolean, error: string|null }
 */
function validateCategory(category) {
    if (!category || typeof category !== 'string') {
        return {
            isValid: false,
            error: 'Category is required'
        };
    }

    if (!VALID_CATEGORIES.includes(category)) {
        return {
            isValid: false,
            error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
        };
    }

    return {
        isValid: true,
        error: null
    };
}

/**
 * Validate cost sum
 * @param {any} sum - Sum to validate
 * @returns {object} - { isValid: boolean, error: string|null, value: number|null }
 */
function validateSum(sum) {
    if (sum === undefined || sum === null) {
        return {
            isValid: false,
            error: 'Sum is required',
            value: null
        };
    }

    const sumValue = Number(sum);

    if (isNaN(sumValue)) {
        return {
            isValid: false,
            error: 'Sum must be a valid number',
            value: null
        };
    }

    if (sumValue <= 0) {
        return {
            isValid: false,
            error: 'Sum must be greater than 0',
            value: null
        };
    }

    if (sumValue > 1000000) {
        return {
            isValid: false,
            error: 'Sum cannot exceed 1,000,000',
            value: null
        };
    }

    return {
        isValid: true,
        error: null,
        value: sumValue
    };
}

/**
 * Validate year for report
 * @param {any} year - Year to validate
 * @returns {object} - { isValid: boolean, error: string|null, value: number|null }
 */
function validateYear(year) {
    if (year === undefined || year === null) {
        return {
            isValid: false,
            error: 'Year is required',
            value: null
        };
    }

    const yearValue = Number(year);

    if (!Number.isInteger(yearValue)) {
        return {
            isValid: false,
            error: 'Year must be an integer',
            value: null
        };
    }

    if (yearValue < 2000 || yearValue > 2100) {
        return {
            isValid: false,
            error: 'Year must be between 2000 and 2100',
            value: null
        };
    }

    return {
        isValid: true,
        error: null,
        value: yearValue
    };
}

/**
 * Validate month for report
 * @param {any} month - Month to validate
 * @returns {object} - { isValid: boolean, error: string|null, value: number|null }
 */
function validateMonth(month) {
    if (month === undefined || month === null) {
        return {
            isValid: false,
            error: 'Month is required',
            value: null
        };
    }

    const monthValue = Number(month);

    if (!Number.isInteger(monthValue)) {
        return {
            isValid: false,
            error: 'Month must be an integer',
            value: null
        };
    }

    if (monthValue < 1 || monthValue > 12) {
        return {
            isValid: false,
            error: 'Month must be between 1 and 12',
            value: null
        };
    }

    return {
        isValid: true,
        error: null,
        value: monthValue
    };
}

module.exports = {
    validateUserId,
    validateCategory,
    validateSum,
    validateYear,
    validateMonth,
    VALID_CATEGORIES
};