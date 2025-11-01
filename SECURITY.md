# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

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

### For Self-Hosted Installations

1. Use strong database passwords
2. Change default JWT_SECRET
3. Enable HTTPS in production
4. Keep dependencies updated
5. Run behind a reverse proxy
6. Use firewall rules
7. Regular backups

### Environment Variables

Never commit:
- .env files
- Credentials
- API keys
- Certificates

Use:
- Strong random secrets: `openssl rand -base64 32`
- Different secrets per environment
- Rotate secrets regularly

## Known Security Considerations

### Ollama Model Access

The Ollama service has access to website content. Ensure:
- Network isolation if processing sensitive sites
- Review model's data retention policies
- Consider local deployment for sensitive use cases

### Playwright Browser

Playwright visits external websites:
- Runs in sandboxed containers
- No persistent storage of credentials
- Isolated browser contexts per audit

## Security Updates

Subscribe to security advisories:
- GitHub Security Advisories
- Watch this repository
- Check CHANGELOG.md regularly

## Vulnerability History

See CHANGELOG.md for security fixes in past releases.

## Contact

- Security issues: nitishagar@gmail.com
- General issues: [GitHub Issues](https://github.com/nitishagar/sober-ai/issues)
