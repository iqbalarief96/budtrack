const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const API_DIR = path.join(__dirname, '..', 'app', 'api');
const OLD_IMPORT = `import { authOptions } from '@/app/api/auth/[...nextauth]/route'`;
const NEW_IMPORT = `import { authOptions } from '@/lib/auth'`;

// Function to recursively get all files in a directory
async function getFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(subdirs.map(async (subdir) => {
    const res = path.resolve(dir, subdir);
    return (await stat(res)).isDirectory() ? getFiles(res) : res;
  }));
  return files.flat();
}

// Function to update imports in a file
async function updateFile(file) {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return false;
  
  try {
    const content = await readFile(file, 'utf8');
    
    if (content.includes(OLD_IMPORT)) {
      console.log(`Updating file: ${file}`);
      const newContent = content.replace(OLD_IMPORT, NEW_IMPORT);
      await writeFile(file, newContent, 'utf8');
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error processing file ${file}:`, err);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Starting import update process...');
    const files = await getFiles(API_DIR);
    
    let updateCount = 0;
    for (const file of files) {
      const updated = await updateFile(file);
      if (updated) updateCount++;
    }
    
    console.log(`Done! Updated ${updateCount} files.`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main(); 