const fs = require('fs');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

walk('api/_handlers', function(err, results) {
  if (err) throw err;
  
  results.filter(f => f.endsWith('.ts')).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    const importValidator = "import { sValidator } from '@hono/standard-validator';\n";
    
    // We match:
    // const body = await c.req.json();
    // const check = v.safeParse(SCHEMA, body);
    // if (!check.success) throw errorFactory.validation(check.issues);
    // const { VARS } = check.output;
    // OR const output = check.output;
    
    const regex = /\.(post|put|delete|patch|get)\s*\(\s*('[^']+'|`[^`]+`)\s*,\s*async\s*\(\s*(c[^)]*)\s*\)\s*=>\s*\{\s*const\s+body\s*=\s*await\s+c\.req\.json\(\);\s*const\s+check\s*=\s*v\.safeParse\(([\s\S]*?),\s*body\);\s*if\s*\(!check\.success\)\s*throw\s+errorFactory\.validation\(check\.issues\);\s*const\s+([^{}]+?|\{[\s\S]+?\})\s*=\s*check\.output;/gm;
    
    content = content.replace(regex, (match, method, path, cParam, schema, vars) => {
       return `.${method}(${path}, sValidator('json', ${schema}, (result) => {
    if (!result.success) throw errorFactory.validation((result as any).error?.issues || []);
  }), async (${cParam}) => {
    const ${vars} = c.req.valid('json');`;
    });
    
    // Check if there are other variations:
    // some might have additional lines between `const body` and `const check`? Usually they are consecutive.
    // Also `let body = ...` or `const payload = ...`
    
    if (content !== originalContent) {
      if (!content.includes('sValidator')) {
         content = importValidator + content;
      }
      fs.writeFileSync(file, content);
      console.log('Patched', file);
    }
  });
});
