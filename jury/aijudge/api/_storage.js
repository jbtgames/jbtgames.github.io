const path = require('path');
const fs = require('fs/promises');

const DATA_ROOT = path.join(__dirname, '..', 'data');

async function readJson(filename) {
  const file = path.join(DATA_ROOT, filename);
  const content = await fs.readFile(file, 'utf8');
  return JSON.parse(content);
}

async function writeJson(filename, data) {
  const file = path.join(DATA_ROOT, filename);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

module.exports = {
  readJson,
  writeJson
};
