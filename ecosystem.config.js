module.exports = {
  apps: [
    {
      name: 'pmb-unjani',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      cwd: '/www/wwwroot/pmb.unjani.ac.id/',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 9532,
      },
    },
  ],
};
