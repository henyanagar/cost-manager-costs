// Unit tests for costs service
const request = require('supertest');
const app = require('../app');

// Mock the models
const Cost = require('../models/cost');
const User = require('../models/user');
const Report = require('../models/report');

jest.mock('../models/cost');
jest.mock('../models/user');
jest.mock('../models/report');

describe('Costs API', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Test POST /api/add - successful creation
    test('POST /api/add should create a new cost', async () => {
        // Mock user exists
        User.findOne.mockResolvedValue({
            id: 123123,
            first_name: 'mosh',
            last_name: 'israeli'
        });

        Cost.create.mockResolvedValue({
            userid: 123123,
            description: 'Lunch',
            category: 'food',
            sum: 50,
            createdAt: new Date()
        });

        const response = await request(app)
            .post('/api/add')
            .send({
                userid: 123123,
                description: 'Lunch',
                category: 'food',
                sum: 50
            });

        expect(response.status).toBe(201);
        expect(response.body.userid).toBe(123123);
    });

    // Test POST /api/add - missing sum
    test('POST /api/add should fail if sum is missing', async () => {
        const response = await request(app)
            .post('/api/add')
            .send({
                userid: 123123,
                description: 'Lunch',
                category: 'food'
            });

        expect(response.status).toBe(400);
        expect(response.body.id).toBe('VALIDATION_ERROR');
        expect(response.body.message).toContain('sum are required');
    });

    // Test POST /api/add - invalid category
    test('POST /api/add should fail with invalid category', async () => {
        const response = await request(app)
            .post('/api/add')
            .send({
                userid: 123123,
                description: 'Gym',
                category: 'not-a-real-category',
                sum: 50
            });

        expect(response.status).toBe(400);
        expect(response.body.id).toBe('INVALID_CATEGORY');
        expect(response.body.message).toContain('Invalid category');
    });

    // Test POST /api/add - user doesn't exist
    test('POST /api/add should fail if user does not exist', async () => {
        User.findOne.mockResolvedValue(null);

        const response = await request(app)
            .post('/api/add')
            .send({
                userid: 999999,
                description: 'Test',
                category: 'food',
                sum: 100
            });

        expect(response.status).toBe(404);
        expect(response.body.id).toBe('USER_NOT_FOUND');
    });

    // Test GET /api/report - successful report generation
    test('GET /api/report should return monthly report', async () => {
        Report.findOne.mockResolvedValue(null); // No cached report

        Cost.find.mockResolvedValue([
            {
                sum: 10,
                createdAt: new Date(2026, 0, 5),
                category: 'food',
                description: 'Breakfast'
            },
            {
                sum: 20,
                createdAt: new Date(2026, 0, 10),
                category: 'health',
                description: 'Medicine'
            }
        ]);

        Report.create = jest.fn().mockResolvedValue({});

        const response = await request(app)
            .get('/api/report')
            .query({
                id: 123123,
                year: 2026,
                month: 1
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('userid');
        expect(response.body).toHaveProperty('costs');
    });

    // Test GET /api/report - missing parameters
    test('GET /api/report should fail without required parameters', async () => {
        const response = await request(app)
            .get('/api/report')
            .query({ id: 123123 }); // Missing year and month

        expect(response.status).toBe(400);
        expect(response.body.id).toBe('VALIDATION_ERROR');
    });

    // Test GET /api/report - returns cached report
    test('GET /api/report should return cached report for past months', async () => {
        const cachedReport = {
            userid: 123123,
            year: 2023,
            month: 1,
            costs: [{ food: [] }, { health: [] }]
        };

        Report.findOne.mockResolvedValue(cachedReport);

        const response = await request(app)
            .get('/api/report')
            .query({
                id: 123123,
                year: 2023,
                month: 1
            });

        expect(response.status).toBe(200);
        expect(response.body.userid).toBe(123123);
    });

});