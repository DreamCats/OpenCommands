const fs = require('fs');
const content = fs.readFileSync('.claude/commands/git/gcmsg.md', 'utf-8');
console.log('Full content:');
console.log(content.substring(0, 200));
console.log('\n---\nYAML match:');
const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
if (yamlMatch) {
  console.log(yamlMatch[1]);
  console.log('\n---\nDescription match:');
  const descMatch = yamlMatch[1].match(/^description:\s*(.+)$/m);
  console.log(descMatch);
}
