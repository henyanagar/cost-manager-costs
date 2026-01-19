// Unit tests for costs service
const request = require('supertest');
const app = require('../app'); // ← Import app.js, NOT server.js

// Mock the models
const Cost = require('../models/cost');
const Report = require('../models/report');
jest.mock('../models/cost');
jest.mock('../models/report');

// Mock fetch for external API calls
global.fetch = jest.fn();

// Inside tests/costs.test.js
test('GET /api/report should return total costs', async () => {
    Cost.find.mockResolvedValue([
        { sum: 10, createdAt: new Date(), category: 'food', description: 'test' }
    ]);

    const response = await request(app)
        .get('/api/report')
        .query({
            id: 123123,  // Route expects 'id', not 'userid'
            year: 2026,
            month: 1
        });

    expect(response.status).toBe(200);
});
// Test 1: Validation for missing mandatory fields
test('POST /api/add should fail if sum is missing', async () => {
    const response = await request(app)
        .post('/api/add')
        .send({
            userid: 123123,
            description: 'Lunch',
            category: 'food'
            // sum is missing here
        });

    expect(response.status).toBe(400);
    expect(response.body.id).toBe("validation_error");
    expect(response.body.message).toContain("sum are required");
});

// Test 2: Validation for invalid category string
test('POST /api/add should fail with invalid category', async () => {
    const response = await request(app)
        .post('/api/add')
        .send({
            userid: 123123,
            description: 'Gym',
            category: 'not-a-real-category', // Invalid string
            sum: 50
        });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Invalid category");
});