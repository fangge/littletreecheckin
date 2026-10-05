const path = require('node:path');

const root = process.env.LITTLETREE_ROOT || '/opt/littletreecheckin';
const apiPort = process.env.LITTLETREE_API_PORT || '3002';

module.exports = {
  apps: [{
    name: 'littletreecheckin-api',
    cwd: path.join(root, 'server'),
    script: 'dist/index.js',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production',
      PORT: apiPort,
    },
    autorestart: true,
    max_memory_restart: '512M',
  }],
};
