const knex = require('knex')
const app = require('../src/app')
const helpers = require('./test-helpers')
const supertest = require('supertest')
const jwt = require('jsonwebtoken')

describe.only('Auth endpoints', () => {
    let db
    const { testUsers } = helpers.makeArticlesFixtures()
    const testUser = testUsers[0]
  
    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })

        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())
    before('cleanup', () => helpers.cleanTables(db))
    afterEach('cleanup', () => helpers.cleanTables(db))

    describe('POST /api/auth/login', () => {
        beforeEach('insert users', () => {
            helpers.seedUsers(db, testUsers)
        })

        const requireFields = ['user_name', 'password']

        requireFields.forEach(field => {
            const loginBody = {
                user_name: testUser.full_name,
                password: testUser.password
            }
            
            it(`responds with 400 required error when '${field}' is missing`, () => {
                delete loginBody[field]

                return supertest(app)
                .post('/api/auth/login')
                .send(loginBody)
                .expect(400, {
                    error: `Missing '${field}' in request body`
                })
            })

            it(`responds 400 'invalid user_name or password' when bad user_name`, () => {
                const InvalidUser = {user_name: 'user-not', password: 'password-not'}
                return supertest(app)
                .post('/api/auth/login')
                .send(InvalidUser)
                .expect(400, {
                    error: `Incorrect user_name or password`
                })
            })

            it('responds with 400 `invalid username or password` when given the wrong password', () => {
                const loginBody = { user_name: testUser.user_name, password: 'existy'}

                return supertest(app)
                .post('/api/auth/login')
                .send(loginBody)
                .expect(400, {
                    error: `Incorrect user_name or password`
                })
            })

            it(`responds 200 and JWT auth token using secret when valid credentials`, () => {
                const userValidCreds = {
                    user_name: testUser.user_name,
                    password: testUser.password,
                }
                const expectedToken = jwt.sign(
                    { user_id: testUser.id }, // payload
                    process.env.JWT_SECRET,
                    {
                        subject: testUser.user_name,
                        algorithm: 'HS256',
                    }
                )
                
                console.log()

                return supertest(app)
                    .post('/api/auth/login')
                    .send(userValidCreds)
                    .expect(200, {
                        authToken: expectedToken,
                    })
            })
        })
    })
})