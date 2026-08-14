#!/usr/bin/env node
// Simple script: wait for Vite to be ready, then launch Electron
const { spawn } = require('child_process');
const http = require('http');

const VITE_URL = 'http://localhost:5173';
const MAX_ATTEMPTS = 30;
const RETRY_MS = 500;

function checkVite(attempt = 0) {
  http.get(VITE_URL, (res) => {
    if (res.statusCode < 500) {
      console.log('[neuriy] Vite ready — launching Electron...');
      const env = { ...process.env, NODE_ENV: 'development', VITE_DEV_SERVER_URL: VITE_URL };
      const electron = require('electron');
      const child = spawn(String(electron), ['.'], { stdio: 'inherit', env });
      child.on('close', (code) => process.exit(code || 0));
    } else {
      retry(attempt);
    }
  }).on('error', () => retry(attempt));
}

function retry(attempt) {
  if (attempt >= MAX_ATTEMPTS) {
    console.error('[neuriy] Timed out waiting for Vite');
    process.exit(1);
  }
  setTimeout(() => checkVite(attempt + 1), RETRY_MS);
}

checkVite();
