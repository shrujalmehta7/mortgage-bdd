const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

const generatedReportPath = path.join(__dirname, '../../reports/html-report/index.html');
const fallbackReportPath = path.join(__dirname, '../../reports/cucumber-report.html');
let reportPath = generatedReportPath;

// Check if the generated report exists and is valid
if (fs.existsSync(reportPath)) {
  const stats = fs.statSync(reportPath);
  if (stats.size > 0) {
    // Generated report exists and has content, use it
  } else {
    reportPath = null;
  }
} else {
  reportPath = null;
}

// If generated report doesn't exist or is empty, check fallback
if (!reportPath || !fs.existsSync(reportPath)) {
  if (fs.existsSync(fallbackReportPath)) {
    const stats = fs.statSync(fallbackReportPath);
    if (stats.size > 0) {
      reportPath = fallbackReportPath;
      console.warn('Using basic HTML report (limited visualization)');
      console.log('For full report with graphs, run: npm run test:report');
    } else {
      reportPath = null;
    }
  }
}

if (!reportPath) {
  console.error('No valid report found.');
  console.error('Generated report expected at:', generatedReportPath);
  console.error('Fallback report expected at:', fallbackReportPath);
  console.log('\nTo generate a report, run: npm run test:report');
  console.log('This will execute tests and generate the HTML report with graphs.');
  process.exit(1);
}

const platform = process.platform;
let command;

if (platform === 'win32') {
  command = `cmd /c start "" "${reportPath}"`;
} else if (platform === 'darwin') {
  command = `open "${reportPath}"`;
} else {
  command = `xdg-open "${reportPath}"`;
}

const tempReportPath = path.join(os.tmpdir(), `report-${Date.now()}.html`);
const maxAttempts = 5;
let attempt = 0;
let lastError = null;

function tryOpen(currentCommand) {
  attempt += 1;
  exec(currentCommand, (error) => {
    if (!error) {
      console.log('Opening report in browser:', reportPath);
      return;
    }

    lastError = error;
    const isLocked = error.message.includes('being used by another process') || error.message.includes('access is denied');

    if (attempt < maxAttempts) {
      if (isLocked && platform === 'win32' && reportPath !== tempReportPath) {
        try {
          fs.copyFileSync(reportPath, tempReportPath);
          console.log('Copied locked report to temporary file:', tempReportPath);
          currentCommand = `cmd /c start "" "${tempReportPath}"`;
        } catch (copyError) {
          console.warn('Unable to copy locked report file, retrying...', copyError.message);
        }
      }
      console.warn(`Report open failed on attempt ${attempt}. Retrying...`);
      setTimeout(() => tryOpen(currentCommand), 500);
      return;
    }

    console.error('Failed to open report:', error.message);
    console.log('Report is available at:', reportPath);
    if (fs.existsSync(tempReportPath)) {
      console.log('Temporary copy is available at:', tempReportPath);
    }
    process.exit(1);
  });
}

tryOpen(command);
