import { Project, Node, ObjectLiteralExpression, PropertyAssignment, ShorthandPropertyAssignment } from 'ts-morph';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * [SCHEMA-DIFF-ANALYZER]
 * Detects breaking changes in ArkType schemas between HEAD and HEAD~1.
 */

const SCHEMA_PATH = 'api/_shared/apiContractSchema.ts';

function getPreviousVersion(filePath: string): string | null {
  try {
    return execSync(`git show HEAD~1:${filePath}`).toString();
  } catch (err) {
    console.warn(`Could not fetch previous version of ${filePath} via git.`);
    return null;
  }
}

interface SchemaField {
  name: string;
  type: string;
  isOptional: boolean;
}

interface SchemaStructure {
  name: string;
  fields: SchemaField[];
}

function parseSchemaFile(project: Project, content: string, fileName: string): SchemaStructure[] {
  const sourceFile = project.createSourceFile(fileName, content, { overwrite: true });
  const schemas: SchemaStructure[] = [];

  // Look for exported const schemas
  sourceFile.getVariableStatements().forEach(v => {
    if (v.isExported()) {
      v.getDeclarations().forEach(decl => {
        const name = decl.getName();
        if (name.endsWith('Schema')) {
          const initializer = decl.getInitializer();
          if (Node.isCallExpression(initializer)) {
            const expression = initializer.getExpression();
            if (expression.getText() === 'type') {
              const args = initializer.getArguments();
              if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
                const fields = parseObjectLiteral(args[0] as ObjectLiteralExpression);
                schemas.push({ name, fields });
              }
            }
          }
        }
      });
    }
  });

  return schemas;
}

function parseObjectLiteral(obj: ObjectLiteralExpression): SchemaField[] {
  const fields: SchemaField[] = [];
  obj.getProperties().forEach(prop => {
    let name = '';
    let typeStr = '';
    let isOptional = false;

    if (Node.isPropertyAssignment(prop)) {
      name = prop.getName().replace(/['"]/g, '');
      const initializer = prop.getInitializer();
      typeStr = initializer?.getText().replace(/['"]/g, '') || 'unknown';
    } else if (Node.isShorthandPropertyAssignment(prop)) {
      name = prop.getName();
      typeStr = 'unknown'; // ArkType usually doesn't use shorthand for definitions
    }

    if (name.endsWith('?')) {
      name = name.slice(0, -1);
      isOptional = true;
    }

    fields.push({ name, type: typeStr, isOptional });
  });
  return fields;
}

function compareSchemas(oldSchemas: SchemaStructure[], newSchemas: SchemaStructure[]) {
  const breakingChanges: string[] = [];

  oldSchemas.forEach(oldSchema => {
    const newSchema = newSchemas.find(s => s.name === oldSchema.name);
    if (!newSchema) {
      breakingChanges.push(`[BREAKING] Schema deleted: ${oldSchema.name}`);
      return;
    }

    oldSchema.fields.forEach(oldField => {
      const newField = newSchema.fields.find(f => f.name === oldField.name);
      if (!newField) {
        breakingChanges.push(`[BREAKING] Field deleted or renamed in ${oldSchema.name}: ${oldField.name}`);
        return;
      }

      // Check if it became optional
      if (!oldField.isOptional && newField.isOptional) {
        breakingChanges.push(`[BREAKING] Field changed from required to optional in ${oldSchema.name}: ${oldField.name}`);
      }

      // Check if it became required
      if (oldField.isOptional && !newField.isOptional) {
        breakingChanges.push(`[BREAKING] Field changed from optional to required in ${oldSchema.name}: ${oldField.name}`);
      }

      // Check type narrowing (simplified)
      if (oldField.type !== newField.type) {
        // This is a naive check. A real one would check if newType is a subset of oldType.
        // For our purposes, any change in type string is flagged as a potential breaking change.
        breakingChanges.push(`[POTENTIAL BREAKING] Type changed in ${oldSchema.name}.${oldField.name}: '${oldField.type}' -> '${newField.type}'`);
      }
    });

    // New required fields in existing schemas are also breaking
    newSchema.fields.forEach(newField => {
      const oldField = oldSchema.fields.find(f => f.name === newField.name);
      if (!oldField && !newField.isOptional) {
        breakingChanges.push(`[BREAKING] New required field added to ${oldSchema.name}: ${newField.name}`);
      }
    });
  });

  return breakingChanges;
}

/**
 * [CONSUMER-IMPACT-MAP]
 * Find usages of the changed schemas in the project.
 */
function findImpactedFiles(changedSchemas: string[]): string[] {
  if (changedSchemas.length === 0) return [];
  
  const impactedFiles = new Set<string>();
  try {
    changedSchemas.forEach(schemaName => {
      // Use grep to find files that mention the schema name (excluding the schema file itself and node_modules)
      const output = execSync(`grep -rl "${schemaName}" src/ --exclude="${SCHEMA_PATH}" --exclude-dir=node_modules || true`).toString();
      output.split('\n').filter(Boolean).forEach(file => impactedFiles.add(file));
    });
  } catch (err) {
    console.error('Error finding impacted files:', err);
  }
  return Array.from(impactedFiles);
}

async function main() {
  const project = new Project();
  const currentContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const previousContent = getPreviousVersion(SCHEMA_PATH);

  if (!previousContent) {
    console.log('No previous version found. Binary comparison skipped.');
    process.exit(0);
  }

  const oldSchemas = parseSchemaFile(project, previousContent, 'old_schema.ts');
  const newSchemas = parseSchemaFile(project, currentContent, 'new_schema.ts');

  const breakingChanges = compareSchemas(oldSchemas, newSchemas);

  if (breakingChanges.length > 0) {
    console.error('\n🚨 Breaking Changes Detected in Schema!\n');
    breakingChanges.forEach(bc => console.error(` - ${bc}`));

    const schemasWithBreakingChanges = Array.from(new Set(breakingChanges.map(bc => {
      const match = bc.match(/in (.*Schema)/);
      return match ? match[1] : null;
    }).filter(Boolean))) as string[];

    console.log('\n🔍 [CONSUMER-IMPACT-MAP] Checking impacted consumers...\n');
    const impactedFiles = findImpactedFiles(schemasWithBreakingChanges);
    
    if (impactedFiles.length > 0) {
      console.log(`The following files are affected (Found ${impactedFiles.length} files):`);
      impactedFiles.forEach(f => console.log(` - ${f}`));

      if (impactedFiles.length > 5) {
        console.warn('\n⚠️ HIGH_RISK: Influence scope exceeds 5 files. Extra caution advised.');
      }
    } else {
      console.log('No direct consumers found naming the schema (Check generic usages or imports).');
    }

    const migrationPlanPath = path.join(process.cwd(), 'MIGRATION_PLAN.md');
    if (!fs.existsSync(migrationPlanPath)) {
      console.error('\n❌ [CI-GATE-BLOCK] Breaking change detected but MIGRATION_PLAN.md is missing.');
      process.exit(1);
    } else {
      console.log('\n✅ MIGRATION_PLAN.md found. Proceeding with caution.');
    }
  } else {
    console.log('\n✅ No breaking changes detected in schema compatibility check.');
  }
}

main().catch(err => {
  console.error('Compatibility check failed:', err);
  process.exit(1);
});
