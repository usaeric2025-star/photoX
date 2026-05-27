const cp = require('child_process');
cp.execSync('git checkout -- src/hooks/core/mutations/useGroupCoverMutation.ts');
console.log('Restored');
