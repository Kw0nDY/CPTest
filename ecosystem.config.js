<<<<<<< HEAD
export default {
  apps: [
    {
      name: 'collaboration-portal',
      script: 'dist/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
=======
module.exports = {
  apps : [{
    name: 'my-app',
    script: './dist/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 80
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 80
    }
  }]
>>>>>>> 4a0a29c78d0a93cc89f517063436e803e9f24fa9
};
