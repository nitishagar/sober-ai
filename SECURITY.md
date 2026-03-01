# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| < 0.3   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### DO NOT create a public GitHub issue

Instead:

1. Email nitishagar@gmail.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

2. Allow up to 48 hours for initial response

3. Work with maintainers to verify and fix

### What to Expect

- Acknowledgment within 48 hours
- Assessment and triage within 1 week
- Fix development and testing
- Coordinated disclosure after patch release

### Disclosure Policy

- **Report received**: We acknowledge within 48 hours
- **Verified**: We confirm the vulnerability exists
- **Fixed**: Patch developed and tested
- **Released**: Security patch published
- **Announced**: Public disclosure with credit

## Security Best Practices

### For Desktop App Users

1. Keep the application updated to the latest version
2. Store API keys securely (the app encrypts them locally)
3. Keep dependencies updated: `npm audit fix`
4. Only enter API keys from trusted LLM providers

### For Contributors

Never commit:
- .env files
- Credentials or API keys
- Certificates or private keys

## Known Security Considerations

### LLM API Keys

API keys for Ollama Cloud and OpenAI are stored locally using electron-store with encryption. Keys are:
- Never transmitted except to the configured LLM provider
- Stored in the user's app data directory
- Not included in audit reports or logs

### Playwright Browser

Playwright visits external websites during audits:
- Runs in isolated browser contexts per audit
- No persistent storage of credentials
- Sandboxed execution environment

## Security Updates

Subscribe to security advisories:
- GitHub Security Advisories
- Watch this repository
- Check CHANGELOG.md regularly

## Contact

- Security issues: nitishagar@gmail.com
- General issues: [GitHub Issues](https://github.com/nitishagar/sober-ai/issues)
