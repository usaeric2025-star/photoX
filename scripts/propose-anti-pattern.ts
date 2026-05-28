import fs from 'fs';
import path from 'path';

async function proposeAntiPattern() {
  const sandboxDir = path.join(process.cwd(), 'sandbox');
  const outputDir = path.join(sandboxDir, 'anti-pattern-proposals');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const files = fs.readdirSync(sandboxDir);
  const postmortems = files.filter(f => f.endsWith('-postmortem.md'));
  
  for (const file of postmortems) {
    const content = fs.readFileSync(path.join(sandboxDir, file), 'utf-8');
    const proposal = `<!-- Proposal based on ${file} -->
## Anti-pattern Proposal
### Root Cause:
[Automatically extracted from ${file}]
### Trigger:
[Automatically extracted from ${file}]
### Path:
[Automatically extracted from ${file}]
`;
    fs.writeFileSync(path.join(outputDir, `proposal-${file}`), proposal);
    console.log(`Proposed anti-pattern from ${file}`);
  }
}

proposeAntiPattern();
