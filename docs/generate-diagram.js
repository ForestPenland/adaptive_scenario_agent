const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure mmdc (Mermaid CLI) is available
try {
  console.log('Checking if mermaid-cli is installed...');
  execSync('npx mmdc --version', { stdio: 'pipe' });
  console.log('mermaid-cli is already installed');
} catch (error) {
  console.log('Installing mermaid-cli...');
  execSync('npm install -g @mermaid-js/mermaid-cli', { stdio: 'inherit' });
}

// Read the Mermaid diagram content
const mermaidFilePath = path.join(__dirname, 'architecture-diagram.md');
const mermaidContent = fs.readFileSync(mermaidFilePath, 'utf8');

// Create a temporary file with proper Mermaid syntax
const tempFilePath = path.join(__dirname, 'temp-diagram.mmd');
fs.writeFileSync(tempFilePath, mermaidContent);

// Generate the PNG using mermaid-cli
const outputPath = path.join(__dirname, 'architecture-diagram.png');
console.log('Generating architecture diagram PNG...');
try {
  execSync(`npx mmdc -i ${tempFilePath} -o ${outputPath} -w 1200 -H 900 -b transparent`, { stdio: 'inherit' });
  console.log(`Diagram generated successfully at ${outputPath}`);
} catch (error) {
  console.error('Error generating diagram:', error.message);
}

// Clean up the temporary file
try {
  fs.unlinkSync(tempFilePath);
} catch (error) {
  console.error('Error removing temporary file:', error.message);
}
