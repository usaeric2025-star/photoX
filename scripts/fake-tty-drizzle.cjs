process.stdout.isTTY = true;
process.stdin.isTTY = true;
process.argv = ['node', 'drizzle-kit', 'generate'];

// Drizzle might check isTTY on the actual fd
const tty = require('tty');
tty.isatty = () => true;

const child_process = require('child_process');
const originalSpawn = child_process.spawn;
// Just run drizzle-kit from within
require('drizzle-kit/bin.cjs');
