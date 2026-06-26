import { exec } from 'child_process';
const child = exec('npx drizzle-kit generate', { stdio: ['pipe', 'pipe', 'pipe'] });

child.stdout.on('data', (data) => {
  console.log('STDOUT:', data);
  if (data.includes('statements?') || data.includes('rename') || data.includes('Drop') || data.includes('❯')) {
    child.stdin.write('\n'); // Just press Enter for everything
  }
});

child.stderr.on('data', (data) => {
  console.error('STDERR:', data);
});

child.on('exit', (code) => {
  console.log('Exited with code:', code);
});
