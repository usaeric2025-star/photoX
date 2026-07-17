import * as v from 'valibot';
const schema1 = v.object({ targetGroupId: v.optional(v.string()) });
const schema2 = v.object({ targetGroupId: v.nullable(v.string()) });
const schema3 = v.object({ targetGroupId: v.string() });

console.log("schema1 (optional) missing:", v.safeParse(schema1, {}).issues?.[0]?.message);
console.log("schema1 (optional) null:", v.safeParse(schema1, { targetGroupId: null }).issues?.[0]?.message);
console.log("schema2 (nullable) missing:", v.safeParse(schema2, {}).issues?.[0]?.message);
console.log("schema3 (string) missing:", v.safeParse(schema3, {}).issues?.[0]?.message);
