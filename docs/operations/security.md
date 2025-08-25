# Security

This page summarizes operational security practices for running Hyper MCP.

Secrets

- Keep API keys and private keys in environment variables, not in code or logs
- Use secret managers in production (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault)
- Avoid printing secrets; do not echo values in shells

Least privilege

- Run the container with a non-root user
- Restrict network egress if possible
- Limit who can start the MCP server processes

Hardening

- Keep dependencies updated
- Enable only the features you need (disable NodeInfo or Community System via env if not used)
- Monitor for abnormal rates/errors; backoff protects upstreams

Validation and sanitization

- Zod schemas enforce input constraints
- All tool inputs should be validated before execution
- Error messages avoid leaking sensitive information

Incident response

- Increase logging level to debug temporarily
- Capture health_check and system_info outputs for diagnosis
- Roll back to a known-good build if necessary
