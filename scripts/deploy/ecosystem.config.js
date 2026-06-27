module.exports = {
  apps: [
    {
      name: 'kummi-school-system',
      script: '.next/standalone/server.js',
      cwd: './', // Run from project root
      instances: 'max', // Scale up to utilize all CPU cores
      exec_mode: 'cluster',
      env: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
    },
  ],
};
