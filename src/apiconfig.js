const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'https://uk1ip13n80.execute-api.us-east-1.amazonaws.com',
  PORT1: '8080',
  PORT2: '8081',
  PORT3: '5030',
  PORT4: '5040',
  PORT5: '5000',
  API_BASE_URL:
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    'https://uk1ip13n80.execute-api.us-east-1.amazonaws.com',
};

export default API_CONFIG;