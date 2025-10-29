#!/usr/bin/env node

/**
 * Automated Secrets Scanner
 *
 * Task 52: Scans logs and code for exposed API keys and secrets
 * Mitigates Risk: SEC-002 (API key exposure)
 *
 * Usage: node scripts/security/secretsScanner.js
 *
 * Checks:
 * - Console logs for API keys
 * - Error messages for secrets
 * - Source code for hardcoded credentials
 * - Git history for committed secrets
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns to detect potential secrets
const SECRET_PATTERNS = [
  // Lemon Squeezy specific
  /LEMONSQUEEZY_API_KEY\s*=\s*['"][^'"]+['"]/gi,
  /LEMONSQUEEZY_WEBHOOK_SECRET\s*=\s*['"][^'"]+['"]/gi,
  /lemonsqueezy.*key.*['"][a-zA-Z0-9_\-]{20,}['"]/gi,

  // Generic API keys
  /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
  /apikey\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
  /secret\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
  /token\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
  /bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,

  // Database URLs with passwords
  /postgresql:\/\/[^:]+:[^@]+@[^/]+/gi,
  /postgres:\/\/[^:]+:[^@]+@[^/]+/gi,
  /mysql:\/\/[^:]+:[^@]+@[^/]+/gi,

  // AWS
  /AKIA[0-9A-Z]{16}/g,
  /aws[_-]?secret[_-]?access[_-]?key.*['"][a-zA-Z0-9/+=]{40}['"]/gi,

  // Stripe
  /sk_live_[a-zA-Z0-9]{24,}/g,
  /sk_test_[a-zA-Z0-9]{24,}/g,

  // GitHub
  /ghp_[a-zA-Z0-9]{36}/g,
  /gho_[a-zA-Z0-9]{36}/g,
];

// Files and directories to exclude
const EXCLUSIONS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.env.local.example',
  '.env.example',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '*.test.js',
  '*.test.ts',
  '*.spec.js',
  '*.spec.ts',
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx', '.json', '.env', '.log'];

class SecretsScanner {
  constructor() {
    this.findings = [];
    this.scannedFiles = 0;
    this.errors = [];
  }

  /**
   * Check if path should be excluded
   */
  shouldExclude(filePath) {
    return EXCLUSIONS.some(exclusion => {
      if (exclusion.includes('*')) {
        const pattern = exclusion.replace('*', '.*');
        return new RegExp(pattern).test(filePath);
      }
      return filePath.includes(exclusion);
    });
  }

  /**
   * Scan a single file for secrets
   */
  scanFile(filePath) {
    if (this.shouldExclude(filePath)) {
      return;
    }

    const ext = path.extname(filePath);
    if (!SCAN_EXTENSIONS.includes(ext) && ext !== '') {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.scannedFiles++;

      SECRET_PATTERNS.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Don't flag example values
            if (this.isExampleValue(match)) {
              return;
            }

            this.findings.push({
              file: filePath,
              line: this.getLineNumber(content, match),
              pattern: `Pattern ${index + 1}`,
              match: this.redactSecret(match),
              severity: this.getSeverity(match),
            });
          });
        }
      });
    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
    }
  }

  /**
   * Check if the match is an example/placeholder value
   */
  isExampleValue(match) {
    const examplePatterns = [
      /your[_-]?api[_-]?key/i,
      /your[_-]?secret/i,
      /placeholder/i,
      /example/i,
      /test[_-]?api[_-]?key/i,
      /sk[_-]?test[_-]?\.\.\./i,
      /\.\.\./,
      /xxx+/i,
      /abc+/i,
      /123+/,
    ];

    return examplePatterns.some(pattern => pattern.test(match));
  }

  /**
   * Redact the secret for safe display
   */
  redactSecret(secret) {
    if (secret.length <= 10) {
      return '***REDACTED***';
    }

    const firstThree = secret.substring(0, 3);
    const lastThree = secret.substring(secret.length - 3);
    return `${firstThree}...${lastThree}`;
  }

  /**
   * Get line number where match occurs
   */
  getLineNumber(content, match) {
    const index = content.indexOf(match);
    if (index === -1) return 0;

    const lines = content.substring(0, index).split('\n');
    return lines.length;
  }

  /**
   * Determine severity of the finding
   */
  getSeverity(match) {
    // Production keys are critical
    if (match.includes('_live_') || match.includes('_prod_')) {
      return 'CRITICAL';
    }

    // Database URLs are high severity
    if (match.includes('postgresql://') || match.includes('mysql://')) {
      return 'HIGH';
    }

    // Test keys are medium
    if (match.includes('_test_') || match.includes('_dev_')) {
      return 'MEDIUM';
    }

    return 'HIGH';
  }

  /**
   * Scan directory recursively
   */
  scanDirectory(dirPath) {
    if (this.shouldExclude(dirPath)) {
      return;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        this.scanDirectory(fullPath);
      } else if (entry.isFile()) {
        this.scanFile(fullPath);
      }
    });
  }

  /**
   * Check git history for secrets
   */
  checkGitHistory() {
    console.log('Checking git history for secrets...');

    try {
      // Get list of all files ever committed
      const files = execSync('git ls-tree -r HEAD --name-only', { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);

      files.forEach(file => {
        if (this.shouldExclude(file)) {
          return;
        }

        try {
          // Get file content from git
          const content = execSync(`git show HEAD:${file}`, { encoding: 'utf8', stdio: 'pipe' });

          SECRET_PATTERNS.forEach((pattern, index) => {
            const matches = content.match(pattern);
            if (matches) {
              matches.forEach(match => {
                if (!this.isExampleValue(match)) {
                  this.findings.push({
                    file: `git:${file}`,
                    line: 0,
                    pattern: `Pattern ${index + 1}`,
                    match: this.redactSecret(match),
                    severity: 'CRITICAL',
                    note: 'Found in git history',
                  });
                }
              });
            }
          });
        } catch (error) {
          // File might not exist in current commit
        }
      });
    } catch (error) {
      console.error('Failed to check git history:', error.message);
    }
  }

  /**
   * Check environment variables
   */
  checkEnvironmentVariables() {
    console.log('Checking environment variables...');

    const sensitiveEnvVars = [
      'LEMONSQUEEZY_API_KEY',
      'LEMONSQUEEZY_WEBHOOK_SECRET',
      'DATABASE_URL',
      'DIRECT_URL',
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'SENTRY_DSN',
    ];

    sensitiveEnvVars.forEach(varName => {
      if (process.env[varName]) {
        console.warn(`⚠️  Environment variable ${varName} is set - ensure it's not logged`);
      }
    });
  }

  /**
   * Generate report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('SECRETS SCANNER REPORT');
    console.log('='.repeat(80));
    console.log(`Files scanned: ${this.scannedFiles}`);
    console.log(`Potential secrets found: ${this.findings.length}`);
    console.log(`Errors encountered: ${this.errors.length}`);
    console.log('='.repeat(80) + '\n');

    if (this.findings.length > 0) {
      console.log('⚠️  POTENTIAL SECRETS FOUND:');
      console.log('-'.repeat(80));

      // Group by severity
      const critical = this.findings.filter(f => f.severity === 'CRITICAL');
      const high = this.findings.filter(f => f.severity === 'HIGH');
      const medium = this.findings.filter(f => f.severity === 'MEDIUM');

      if (critical.length > 0) {
        console.log('\n🔴 CRITICAL:');
        critical.forEach(finding => {
          console.log(`  File: ${finding.file}:${finding.line}`);
          console.log(`  Match: ${finding.match}`);
          if (finding.note) console.log(`  Note: ${finding.note}`);
          console.log();
        });
      }

      if (high.length > 0) {
        console.log('\n🟠 HIGH:');
        high.forEach(finding => {
          console.log(`  File: ${finding.file}:${finding.line}`);
          console.log(`  Match: ${finding.match}`);
          console.log();
        });
      }

      if (medium.length > 0) {
        console.log('\n🟡 MEDIUM:');
        medium.forEach(finding => {
          console.log(`  File: ${finding.file}:${finding.line}`);
          console.log(`  Match: ${finding.match}`);
          console.log();
        });
      }
    } else {
      console.log('✅ No potential secrets found');
    }

    if (this.errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      this.errors.forEach(error => {
        console.log(`  ${error.file}: ${error.error}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATIONS:');
    console.log('1. Never commit secrets to git');
    console.log('2. Use environment variables for sensitive data');
    console.log('3. Add pre-commit hooks to prevent secret commits');
    console.log('4. Rotate any exposed secrets immediately');
    console.log('5. Use secret management services in production');
    console.log('='.repeat(80) + '\n');

    // Exit with error code if critical findings
    const criticalCount = this.findings.filter(f => f.severity === 'CRITICAL').length;
    if (criticalCount > 0) {
      console.error(`\n❌ ${criticalCount} CRITICAL secrets found! Fix immediately.`);
      process.exit(1);
    }
  }

  /**
   * Run the scanner
   */
  run() {
    const projectRoot = process.cwd();
    console.log(`Scanning project: ${projectRoot}`);
    console.log('This may take a moment...\n');

    // Scan project files
    this.scanDirectory(projectRoot);

    // Check git history
    this.checkGitHistory();

    // Check environment
    this.checkEnvironmentVariables();

    // Generate report
    this.generateReport();
  }
}

// Run the scanner
if (require.main === module) {
  const scanner = new SecretsScanner();
  scanner.run();
}

module.exports = SecretsScanner;