require('dotenv').config();

const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /', () => {
  it(' should return the index page', async function(done) {
    this.timeout(10000); // Set the timeout to 5 seconds.

    const server = await import('../server.mjs')
    const res = await chai.request(server.default).get('/');

    expect(res).to.have.status(200);
    done();
  });
});

describe('POST /api/v1/users', () => {
    it('should create a new user and return a jwt token', function(done) {
      import('../server.mjs').then((server) => {

        this.timeout(10000); // Set the timeout to 5 seconds.

        const newUser = {name: 'Test User', email: 'testuser@gmail.com', password: 'testpassword' };
    
        chai
          .request(server)
          .post('/api/v1/users')
          .send(newUser)
          .end((err, res) => {
            expect(err).to.be.null;
            expect(res).to.have.status(201);
            expect(res.body).to.be.a('object');
            expect(res.body).to.have.property('token');
            
            const token = res.body.token;
            
            // Here, you can further test the JWT token if needed, for example:
            // - Verify the token's signature
            // - Decode the token and check its payload
            
            // For simplicity, let's just check if the token exists
            expect(token).to.not.be.empty;

            done();
          });
      });
    });
  });