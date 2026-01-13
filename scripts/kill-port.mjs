import { execSync } from 'node:child_process';

const port = Number(process.argv[2]);
if (!Number.isFinite(port) || port <= 0) {
  console.error('Usage: node scripts/kill-port.mjs <port>');
  process.exit(0);
}

function safeExec(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

const platform = process.platform;

if (platform === 'win32') {
  const out = safeExec(`netstat -ano | findstr ":${port}"`);
  if (!out) process.exit(0);

  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid)) pids.add(pid);
  }

  for (const pid of pids) {
    // Kill only if it is a node process
    const name = safeExec(`tasklist /FI "PID eq ${pid}"`);
    if (!name.toLowerCase().includes('node.exe')) continue;
    safeExec(`taskkill /PID ${pid} /F`);
    console.log(`Freed port ${port} (killed node pid ${pid})`);
  }

  process.exit(0);
}

// macOS / Linux
const pids = safeExec(`lsof -ti :${port}`);
if (!pids) process.exit(0);

for (const pid of pids.split(/\s+/)) {
  if (!pid) continue;
  safeExec(`kill -9 ${pid}`);
  console.log(`Freed port ${port} (killed pid ${pid})`);
}

