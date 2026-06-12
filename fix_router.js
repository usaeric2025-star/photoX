const fs = require('fs');
const execSync = require('child_process').execSync;

const files = execSync('grep -rl "useNavigate\\|useLocation\\|useParams" src/ --include="*.tsx" --include="*.ts"').toString().split('\n').filter(Boolean);

files.forEach(file => {
    if (file === 'src/hooks/core/useRouterSafe.ts') return;
    
    let content = fs.readFileSync(file, 'utf8');
    
    // Add useRouterSafe import if we will replace something
    let needsImport = false;
    
    // Replace const { x } = useParams() with useRouterSafe().params
    // Actually, we'd better replace the hook declaration. 
    // e.g. const location = useLocation() --> const { location } = useRouterSafe()
    
    const hasUseLocation = content.includes('useLocation()');
    const hasUseNavigate = content.includes('useNavigate()');
    const hasUseParams = /useParams\([^)]*\)/.test(content);
    
    if (hasUseLocation || hasUseNavigate || hasUseParams) {
        needsImport = true;
        
        let destructors = [];
        if (hasUseLocation) {
            destructors.push('location');
            content = content.replace(/(\s*const\s+)?location\s*=\s*useLocation\(\);?/g, '');
        }
        if (hasUseNavigate) {
            destructors.push('navigate');
            content = content.replace(/(\s*const\s+)?navigate\s*=\s*useNavigate\(\);?/g, '');
        }
        if (hasUseParams) {
            destructors.push('params');
            content = content.replace(/(\s*const\s+)?params\s*=\s*useParams\([^)]*\)(\s*as\s+any)?;?/g, '');
        }
        
        // Wait, removing the declarations entirely might drop `const navigate` completely but later they use `navigate()`.
        // We should replace the RHS.
        
        // Let's reload content to not mess it up
        content = fs.readFileSync(file, 'utf8');
        
        if (hasUseLocation) {
            content = content.replace(/useLocation\(\)/g, "useRouterSafe().location");
        }
        if (hasUseNavigate) {
            content = content.replace(/useNavigate\(\)/g, "useRouterSafe().navigate");
        }
        if (hasUseParams) {
            content = content.replace(/useParams\([^)]*\)(?:\s*as\s+any)?/g, "useRouterSafe().params");
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
    
    // We should also replace variables where they called it and assigned.
    // e.g. const location = useRouterSafe().location;
    // this is perfectly fine syntax!
    
    fs.writeFileSync(file, content);
    console.log("Updated: " + file);
});
