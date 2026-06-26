const pty = require('node:child_process');
try {
  const result = pty.execSync('npx drizzle-kit generate', { stdio: 'pipe' });
  console.log(result.toString());
} catch(e) {
  console.log(e.stdout.toString());
  console.error(e.stderr.toString());
}
