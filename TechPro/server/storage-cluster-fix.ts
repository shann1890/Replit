// This script fixes all remaining 'db' references in storage.ts
import { readFileSync, writeFileSync } from 'fs';

const filePath = './server/storage.ts';
let content = readFileSync(filePath, 'utf8');

// Replace all remaining 'db.' with 'replicaDb.' for read operations
// and ensure write operations use 'primaryDb.'
content = content.replace(/await db\./g, 'await replicaDb.');
content = content.replace(/await replicaDb\.insert/g, 'await primaryDb.insert');
content = content.replace(/await replicaDb\.update/g, 'await primaryDb.update');
content = content.replace(/await replicaDb\.delete/g, 'await primaryDb.delete');

writeFileSync(filePath, content);
console.log('Fixed all database references in storage.ts');