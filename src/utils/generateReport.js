const report = require('multiple-cucumber-html-reporter');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const reportDir = path.join(__dirname, '../../reports');
const jsonReport = path.join(reportDir, 'cucumber-report.json');
const htmlReport = path.join(reportDir, 'cucumber-report.html');
const htmlReportDir = path.join(reportDir, 'html-report');

if (!fs.existsSync(jsonReport)) {
  if (fs.existsSync(htmlReport)) {
    console.log('HTML report already exists at reports/cucumber-report.html');
    process.exit(0);
  }

  console.log('No cucumber-report.json found. Run tests first.');
  process.exit(0);
}

// Check if JSON file is empty or has valid content
const fileStats = fs.statSync(jsonReport);
if (fileStats.size === 0) {
  console.warn('Warning: cucumber-report.json is empty. Tests may not have produced results.');
  console.log('Run npm run test:report to execute tests and generate a report.');
  process.exit(0);
}

// Validate JSON content
try {
  const jsonContent = fs.readFileSync(jsonReport, 'utf-8');
  const data = JSON.parse(jsonContent);

  if (!Array.isArray(data) || data.length === 0) {
    console.warn('Warning: No test results found in cucumber-report.json');
    console.log('Run tests using npm run test:report to generate test data.');
    process.exit(0);
  }
} catch (error) {
  console.error('Error: Invalid JSON in cucumber-report.json:', error.message);
  process.exit(1);
}

report.generate({
  jsonDir: reportDir,
  reportPath: htmlReportDir,
  theme: 'bootstrap',
  metadata: {
    browser: {
      name: process.env.BROWSER || 'chromium',
      version: 'Latest',
    },
    device: 'Local Machine',
    platform: {
      name: process.platform,
    },
  },
  customData: {
    title: 'Test Execution Report',
    data: [
      { label: 'Project', value: 'Mortgage Advice Bureau BDD Tests' },
      { label: 'Environment', value: 'Test' },
      { label: 'Browser', value: process.env.BROWSER || 'chromium' },
      { label: 'Execution Time', value: new Date().toISOString() },
    ],
  },
  displayDuration: true,
  durationInMS: true,
  openReportInBrowser: false,
  saveCollectedJSON: true,
  noInlineScreenshots: false,
  removeEmptyHooks: true,
});

// Remove author branding from generated HTML files
console.log('Cleaning up author branding...');
try {
  const platform = process.platform;

  // Use sed to remove all lines containing Wasiq branding
  if (platform === 'win32') {
    // Windows: use findstr and for loop
    execSync(`cd "${htmlReportDir}" && for /r %f in (*.html) do powershell -NoProfile -Command "(gc '%f') -replace '.*Wasiq.*', '' -replace '.*wasiqbhamla.*', '' -replace '.*WasiqB.*', '' -replace '.*WasiqBhamla.*', '' -replace '.*@WasiqBhamla.*', '' -replace '.*github\\.com/WasiqB.*', '' -replace '.*linkedin.*wasiqbhamla.*', '' -replace '.*stackoverflow.*wasiq-bhamla.*', '' | sc '%f'"`, { shell: true, stdio: 'pipe' });
  } else {
    // Unix/Mac: use sed
    execSync(`find "${htmlReportDir}" -name "*.html" -exec sed -i '/Wasiq/d; /wasiqbhamla/d; /WasiqB/d; /WasiqBhamla/d; /@WasiqBhamla/d; /github\\.com\\/WasiqB/d; /linkedin.*wasiqbhamla/d; /stackoverflow.*wasiq-bhamla/d' {} \\;`);
  }
  console.log('Branding removed successfully');
} catch (error) {
  console.warn('Warning: Could not remove branding:', error.message);
}

console.log('HTML Report generated: reports/html-report/index.html');
