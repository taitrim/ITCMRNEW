import { readFileSync, writeFileSync } from 'fs';

let data = readFileSync('prisma/schema.prisma', 'utf8');

// For each error about relation field using optional FK, make the relation optional too
// Pattern: find lines with `String?` that are FK fields (end in someId), then find preceding relation line
const lines = data.split('\n');
const result = [];

for (let i = 0; i < lines.length; i++) {
  const current = lines[i];
  const trimmed = current.trim();

  // Check if this line is an FK field that becomes optional
  const isOptionalFK = /^\w+Id\s+String\?\s*$/.test(trimmed);

  if (isOptionalFK) {
    // Look back for the relation field (usually the line before)
    const prevLine = result[result.length - 1];
    if (prevLine && prevLine.includes('@relation(') && !prevLine.includes('?')) {
      // Make the relation field optional too
      result[result.length - 1] = prevLine.replace(/(\s+)(\w+)(\s+@relation\()/, '$1$2?$3');
    }
  }

  result.push(current);
}

data = result.join('\n');
writeFileSync('prisma/schema.prisma', data);
console.log('Fixed relation fields to match optional FKs');
