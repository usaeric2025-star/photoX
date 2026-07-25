sed -i "s/agnes_api_key: secretsMap\['agnes'\] || '',/agnes_api_key: secretsMap['agnes'] || '',\n        gemini_api_key: secretsMap['gemini'] || '',/" api/_handlers/admin/settings.ts
sed -i "s/const keysToFetch = \['openrouter', 'agnes', 'PRIMARY_AI_PROVIDER', 'openrouter_model', 'agnes_model'\];/const keysToFetch = \['openrouter', 'agnes', 'gemini', 'PRIMARY_AI_PROVIDER', 'openrouter_model', 'agnes_model', 'gemini_model'\];/" api/_handlers/admin/settings.ts
sed -i "s/let hasAgnes = !!config.agnes;/let hasAgnes = !!config.agnes;\n    let hasGemini = !!config.gemini;/" api/_handlers/admin/settings.ts
sed -i "s/agnes: hasAgnes,/agnes: hasAgnes,\n            gemini: hasGemini,/" api/_handlers/admin/settings.ts
sed -i "s/agnes_model: config.agnes_model || ''/agnes_model: config.agnes_model || '',\n            gemini_model: config.gemini_model || ''/" api/_handlers/admin/settings.ts
