const fs = require('fs');
const glob = require('glob');

function replaceInFiles(pattern, search, replacement) {
  const files = glob.sync(pattern);
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(search)) {
      content = content.replace(new RegExp(search, 'g'), replacement);
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
}

replaceInFiles('src/**/*.ts*', '#src/services/group/commands.js', './commands.js');
replaceInFiles('src/**/*.ts*', '#src/services/group/queries.js', './queries.js');
