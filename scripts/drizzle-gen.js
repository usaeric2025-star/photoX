import { spawn } from 'child_process';

const child = spawn('node', ['node_modules/drizzle-kit/bin.cjs', 'generate'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

setTimeout(() => {
  child.kill();
  console.log('Killed after 5s');
  process.exit(0);
}, 5000);

child.stdout.on('data', (data) => {
  const str = data.toString();
  console.log('STDOUT:', str);
  if (str.includes('?')) {
    // Write Enter key
    child.stdin.write('\r\n');
  }
});

child.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

child.on('exit', (code) => {
  console.log('Exited with code:', code);
  process.exit(code || 0);
});
