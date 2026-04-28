require('dotenv').config();
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'secret_vyrobca'; // Default for Vyrobca in decentralized setup
const payload = {
  sub: 1,
  email: 'expired@pharma.sk',
  role: 'manufacturer',
  org: 'VyrobcaMSP',
  iat: Math.floor(Date.now() / 1000) - 10000,
  exp: Math.floor(Date.now() / 1000) - 5000 // Expired 5000 seconds ago
};

const token = jwt.sign(payload, secret);
console.log(token);
