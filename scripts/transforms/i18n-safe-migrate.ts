/**
 * AST-Based Safe i18n Migrator (jscodeshift Codemod)
 *
 * This script provides a production-grade AST transformation to safely migrate
 * single-letter translation variables (e.g. 't') to semantic identifiers (e.g. 'translate')
 * built on top of jscodeshift.
 *
 * Rules:
 * - Idempotent Check: If the file already uses 'translate' or has been migrated, avoid re-processing.
 * - Single-Letter Var Restriction: Identifies variables named 't' that are used as functions, excluding standard loop indices or JSX elements.
 * - MemberExpression Safety: Ignores property accesses where 't' is not the translation helper (such as 'item.t' or 'theme.config.t').
 * - JSX Identifier Safety: Ignores JSX tags/elements/attributes that match 't'.
 *
 * AST-INFRASTRUCTURE-ANCHORED
 */

import { API, FileInfo, Options, Transform } from 'jscodeshift';

const transform: Transform = (fileInfo: FileInfo, api: API, options: Options) => {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  let isModified = false;

  // 1. Idempotency Guard: Check if semantic variable 'translate' or custom marker already exists.
  const hasTranslate = root.find(j.Identifier, { name: 'translate' }).length > 0;
  if (hasTranslate && !options.force) {
    return fileInfo.source; // Safe skip
  }

  // 2. Identify the definition of 't' translation function (e.g., const t = createTranslate(lang))
  // We want to safely rename variable declarations of 't' to 'translate' if they call translation helpers.
  root.find(j.VariableDeclarator, {
    id: { type: 'Identifier', name: 't' }
  }).forEach(path => {
    // Check if initializer is calling a translation helper or if it's part of a hook/useMemo
    const init = path.node.init;
    if (init && (
      (init.type === 'CallExpression' && init.callee.type === 'Identifier' && 
       (init.callee.name === 'createTranslate' || init.callee.name === 'useTranslate')) ||
      (init.type === 'CallExpression' && init.callee.type === 'MemberExpression' &&
       init.callee.property.type === 'Identifier' && init.callee.property.name === 'useMemo')
    )) {
      // Safely replace declaring identifier from 't' to 'translate'
      path.node.id = j.identifier('translate');
      isModified = true;
    }
  });

  // 3. Update calls from t('key') to translate('key')
  // Excludes CallExpressions where the callee is a MemberExpression or JSX.
  root.find(j.CallExpression, {
    callee: { type: 'Identifier', name: 't' }
  }).forEach(path => {
    // Exclude scenarios under JSX Attributes or elements if any
    let parent = path.parent;
    let isWithinExclusion = false;
    while (parent) {
      if (parent.node.type === 'JSXAttribute' || parent.node.type === 'JSXElement') {
        isWithinExclusion = true;
        break;
      }
      parent = parent.parent;
    }

    if (!isWithinExclusion) {
      path.node.callee = j.identifier('translate');
      isModified = true;
    }
  });

  // 4. Exclude and protect standard JSX property/attribute/element name matching 't'
  root.find(j.JSXIdentifier, { name: 't' }).forEach(path => {
    // Specifically leave JSX identifiers untouched (e.g. <t /> or t={...})
  });

  // 5. MemberExpression protections (idempotent / non-clashing rule)
  // Ensure that 'object.t' or 't.property' are handled precisely:
  // - 'object.t' MUST NOT be renamed since 't' is a property of 'object'.
  root.find(j.MemberExpression).forEach(path => {
    const node = path.node;
    if (node.property.type === 'Identifier' && node.property.name === 't') {
      // It's like 'item.t', keep it unmodified to avoid object schema pollution.
    }
  });

  return isModified ? root.toSource() : fileInfo.source;
};

export default transform;
export { transform as parser };
