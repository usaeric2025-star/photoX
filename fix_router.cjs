const fs = require('fs');
const execSync = require('child_process').execSync;

const files = execSync('grep -rl "useNavigate\\|useLocation\\|useParams" src/ --include="*.tsx" --include="*.ts"').toString().split('\n').filter(Boolean);

files.forEach(file => {
    if (file === 'src/hooks/core/useRouterSafe.ts') return;
    
    let content = fs.readFileSync(file, 'utf8');
    
    let needsImport = false;
    
    const hasUseLocation = content.includes('useLocation(');
    const hasUseNavigate = content.includes('useNavigate(');
    const hasUseParams = /useParams\([^)]*\)/.test(content) || content.includes('useParams()');
    
    if (hasUseLocation || hasUseNavigate || hasUseParams) {
        needsImport = true;
        
        if (hasUseLocation) {
            content = content.replace(/useLocation\(\)/g, "useRouterSafe().location");
        }
        if (hasUseNavigate) {
            content = content.replace(/useNavigate\(\)/g, "useRouterSafe().navigate");
        }
        if (hasUseParams) {
            content = content.replace(/useParams\([^)]*\)(?:\s*as\s+any)?/g, "useRouterSafe().params");
            content = content.replace(/useParams\(\)(?:\s*as\s+any)?/g, "useRouterSafe().params");
        }
    }
    
    if (needsImport) {
        // Fix imports
        content = content.replace(/useNavigate,? ?/g, '');
        content = content.replace(/useLocation,? ?/g, '');
        content = content.replace(/useParams,? ?/g, '');
        
        content = content.replace(/import\s*{\s*}\s*from\s*['"]@tanstack\/react-router['"];?\n/g, '');
        content = content.replace(/,\s*}/g, ' }');
        content = content.replace(/{\s*,/g, '{ ');
        
        if (!content.includes('useRouterSafe')) {
            content = "import { useRouterSafe } from '@/hooks/core/useRouterSafe';\n" + content;
        }
    }
    
    fs.writeFileSync(file, content);
    console.log("Updated: " + file);
});
