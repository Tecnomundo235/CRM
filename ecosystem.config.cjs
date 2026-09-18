module.exports = {
  apps: [
    {
      name: "docenty-pro",
      script: "dist/server.cjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "350M",
      node_args: "--max-old-space-size=256",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      env_file: ".env",
      exp_backoff_restart_delay: 200,
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      merge_logs: true,
      time: true
    }
  ]
};
