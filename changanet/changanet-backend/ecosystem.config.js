// ecosystem.config.js
module.exports = {
  apps : [{
    name   : "changanet-backend",
    script : "./src/server.js",
    instances : "max",
    exec_mode : "cluster",
    env: {
      NODE_ENV: "development",
      PORT: 3002
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3002
    }
  }]
}
