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

    // Pattern to match:
    // .METHOD('PATH', sValidator('json', SCHEMA, (result) => { ... }), async (c) => {
    //    const VARS = c.req.valid('json');
    //
    // and replace with:
    // .METHOD('PATH', async (c) => {
    //    const body = await c.req.json();
    //    const check = v.safeParse(SCHEMA, body);
    //    if (!check.success) throw errorFactory.validation(check.issues);
    //    const VARS = check.output;

    const regex = /\.(post|put|delete|patch|get)\s*\(\s*('[^']+'|`[^`]+`)\s*,\s*sValidator\s*\(\s*'json'\s*,\s*([\s\S]*?)\s*,\s*\(\s*result\s*\)\s*=>\s*\{\s*if\s*\(!result\.success\)\s*throw\s*errorFactory\.validation\(\(result\s*as\s*any\)\.error\?\.issues\s*\|\|\s*\[\]\);\s*\}\s*\)\s*,\s*async\s*\(\s*(c[^)]*)\s*\)\s*=>\s*\{\s*const\s+([^{}]+?|\{[\s\S]+?\})\s*=\s*c\.req\.valid\('json'\);/gm;
    
    content = content.replace(regex, (match, method, path, schema, cParam, vars) => {
       return `.${method}(${path}, async (${cParam}) => {
    const body = await c.req.json();
    const check = v.safeParse(${schema}, body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const ${vars} = check.output;`;
    });
    
    // Also remove import { sValidator } from '@hono/standard-validator';
    content = content.replace(/import\s*\{\s*sValidator\s*\}\s*from\s*'@hono\/standard-validator';?\n?/g, '');

    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      console.log('Reverted', file);
    }
  });
});
