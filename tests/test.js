const request = require('supertest');
const expect = require('chai').expect;
// ייבוא האפליקציה שלך (וודאי שקובץ ה-server שלך מייצא את ה-app)
const app = require('../app');

describe('Cost Manager Cost API Unit Tests', function() {
    this.timeout(10000); // נותן לטסטים עד 10 שניות לרוץ (מתאים לעבודה מול ענן)
    // בדיקת אנדפוינט הוספת עלות
    describe('POST /api/add', function() {
        it('should add a new cost item and return it', async function() {
            const newCost = {
                userid: 123123,
                description: 'test milk',
                category: 'food',
                sum: 15
            };

            const response = await request(app)
                .post('/api/add')
                .send(newCost);

            expect(response.status).to.equal(200);
            expect(response.body).to.have.property('description', 'test milk');
            expect(response.body).to.have.property('sum', 15);
        });

        it('should return error if category is invalid', async function() {
            const invalidCost = {
                userid: 123123,
                description: 'test',
                category: 'invalid_cat', // קטגוריה שלא קיימת
                sum: 10
            };

            const response = await request(app)
                .post('/api/add')
                .send(invalidCost);

            expect(response.status).to.not.equal(200);
            expect(response.body).to.have.property('id');
        });
    });

    // בדיקת אנדפוינט הדו"ח החודשי
    describe('GET /api/report', function() {
        it('should return a report for a specific month', async function() {
            const response = await request(app)
                .get('/api/report')
                .query({ id: 123123, year: 2025, month: 12 });

            expect(response.status).to.equal(200);
            expect(response.body).to.have.property('userid', 123123);
            expect(response.body).to.have.property('costs');
            expect(Array.isArray(response.body.costs)).to.be.true;
        });
    });


});