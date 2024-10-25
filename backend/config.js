require('dotenv').config();

const config = {
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  frontend: {
    url: process.env.FRONTEND_URL,
  }
};

// Validate required environment variables
const requiredEnvVars = [
  ['EMAIL_USER', config.email.user],
  ['EMAIL_PASS', config.email.pass],
  ['JWT_SECRET', config.jwt.secret],
  ['FRONTEND_URL', config.frontend.url],
];

for (const [name, value] of requiredEnvVars) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

module.exports = config;