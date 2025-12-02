#!/usr/bin/env node

// Script para iniciar el servidor con el puerto correcto
// Usa la variable de entorno PORT de Render o el puerto 3000 por defecto

const { exec } = require('child_process');

const port = process.env.PORT || 3000;

console.log(`Starting server on port ${port}...`);

const server = exec(`npx serve -s dist -l ${port}`);

server.stdout.pipe(process.stdout);
server.stderr.pipe(process.stderr);

server.on('exit', (code) => {
  process.exit(code);
});
