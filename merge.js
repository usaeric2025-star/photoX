import fs from 'fs';
const photoServicePath = 'src/services/photoService.ts';
const photoMutationPath = 'src/services/photoMutationService.ts';

const photoContent = fs.readFileSync(photoServicePath, 'utf8');
const mutationContent = fs.readFileSync(photoMutationPath, 'utf8');

// just append mutationContent
// some imports might be duplicated, but TS/Vite usually resolves them, or we can clean them up.
fs.writeFileSync(photoServicePath, photoContent + '\n\n// --- from photoMutationService.ts ---\n\n' + mutationContent);

const groupServicePath = 'src/services/groupService.ts';
const groupMutationPath = 'src/services/groupMutationService.ts';

const groupContent = fs.readFileSync(groupServicePath, 'utf8');
const groupMutContent = fs.readFileSync(groupMutationPath, 'utf8');

fs.writeFileSync(groupServicePath, groupContent + '\n\n// --- from groupMutationService.ts ---\n\n' + groupMutContent);
