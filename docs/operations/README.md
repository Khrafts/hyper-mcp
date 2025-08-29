# Operations Guide

> **Production-ready deployment** and monitoring for enterprise-grade AI-DeFi infrastructure 🚀

This guide covers everything you need to deploy, monitor, and maintain **hl-eco-mcp** in production environments. From single-instance deployments to high-availability clusters.

## 🚀 Deployment Options

### NPM Package (Recommended)

```bash
# Global installation
npm install -g hl-eco-mcp

# Run in production
NODE_ENV=production hl-eco-mcp

# With process manager
pm2 start hl-eco-mcp --name "hyperliquid-mcp"
```

### Docker Deployment

```bash
# Build from source
docker build -t hl-eco-mcp:latest .
docker run -d --name hl-eco-mcp \
  -p 3000:3000 \
  -e HYPERLIQUID_PRIVATE_KEY=your_key \
  -e NODE_ENV=production \
  hl-eco-mcp:latest

# Docker Compose
version: '3.8'
services:
  hl-eco-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - HYPERLIQUID_PRIVATE_KEY=${HYPERLIQUID_PRIVATE_KEY}
    restart: unless-stopped
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hl-eco-mcp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hl-eco-mcp
  template:
    spec:
      containers:
        - name: hl-eco-mcp
          image: hl-eco-mcp:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: HYPERLIQUID_PRIVATE_KEY
              valueFrom:
                secretKeyRef:
                  name: hyperliquid-secrets
                  key: private-key
```

## 👩‍⚕️ Health Monitoring

### Built-in Health Checks

```bash
# System information
curl http://localhost:3000/tools/system_info

# Health check (all adapters, tools, sessions)
curl http://localhost:3000/tools/health_check

# HyperLiquid integration health
curl http://localhost:3000/tools/hyperliquid_health_check
```

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "hyperliquid": {
      "status": "healthy",
      "latency": 145,
      "last_check": "2024-01-15T10:29:55Z"
    },
    "community_protocols": {
      "loaded": 1,
      "active": 1,
      "errors": 0
    }
  },
  "uptime": 86400,
  "memory_usage": "142MB",
  "active_sessions": 12
}
```

### Logging Configuration

```bash
# Production logging (JSON format)
LOG_LEVEL=info NODE_ENV=production hl-eco-mcp

# Debug mode
LOG_LEVEL=debug hl-eco-mcp

# Disable console logging (file only)
ENABLE_CONSOLE_LOGGING=false hl-eco-mcp
```

## 📊 Observability & Monitoring

### Key Metrics to Monitor

#### Server Metrics

- **Request Rate**: MCP requests per minute
- **Response Time**: P95/P99 latencies for tool calls
- **Error Rate**: Failed requests as % of total
- **Active Sessions**: Concurrent AI agent connections

#### Integration Health

- **HyperLiquid API**: Response times, error rates, WebSocket status
- **Community Protocols**: Protocol availability, validation errors
- **Rate Limiting**: API quota usage, throttling events

### Log Aggregation

#### ELK Stack Integration

```yaml
# filebeat.yml
filebeat.inputs:
  - type: docker
    containers.ids:
      - '*'
    processors:
      - add_docker_metadata: ~
      - decode_json_fields:
          fields: ['message']
          target: ''

output.elasticsearch:
  hosts: ['elasticsearch:9200']
```

#### Datadog Integration

```bash
# Add Datadog agent as sidecar
docker run -d --name datadog-agent \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /proc/:/host/proc/:ro \
  -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro \
  -e DD_API_KEY=your_api_key \
  -e DD_LOGS_ENABLED=true \
  -e DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true \
  datadog/agent:latest
```

### Alerting Rules

- **High Error Rate**: >5% errors for 5 minutes
- **API Latency**: P95 >2s for 3 minutes
- **WebSocket Disconnection**: HyperLiquid feed down >30s
- **Memory Usage**: >80% for 10 minutes
- **Disk Space**: >85% used

## ⚡ Performance Optimization

### Configuration Tuning

```bash
# High-throughput configuration
MAX_CONCURRENT_REQUESTS=50          # Default: 10
CACHE_TTL_SECONDS=30                # Default: 60
API_TIMEOUT_MS=15000                # Default: 30000
API_RATE_LIMIT_REQUESTS_PER_MINUTE=300  # Default: 60

# Memory optimization
NODE_OPTIONS="--max-old-space-size=2048"  # 2GB heap
```

### Load Testing

```bash
# Install load testing tools
npm install -g artillery

# Basic load test
echo 'config:
  target: http://localhost:3000
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: health_check
    requests:
      - get:
          url: /tools/health_check' > loadtest.yml

artillery run loadtest.yml
```

### Horizontal Scaling

```bash
# Run multiple instances behind load balancer
docker-compose scale hl-eco-mcp=3

# Kubernetes horizontal pod autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hl-eco-mcp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hl-eco-mcp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🛡️ Security Best Practices

### Secret Management

```bash
# Use secret management systems
# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id hyperliquid-keys

# HashiCorp Vault
vault kv get -field=private_key secret/hyperliquid

# Kubernetes secrets
kubectl create secret generic hyperliquid-secrets \
  --from-literal=private-key=your_private_key
```

### Network Security

```bash
# Run with non-root user
USER 1001
EXPOSE 3000

# Use TLS for production
SSL_CERT_PATH=/certs/server.crt
SSL_KEY_PATH=/certs/server.key

# Firewall rules (iptables)
iptables -A INPUT -p tcp --dport 3000 -s trusted_subnet -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j DROP
```

### Container Security

```dockerfile
# Use minimal base image
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S hyperliquid -u 1001

# Set security headers
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV NODE_ENV=production

USER hyperliquid
```

## 🚀 Production Deployment Patterns

### High Availability Setup

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - hl-eco-mcp

  hl-eco-mcp:
    build: .
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    secrets:
      - hyperliquid_private_key
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/tools/health_check']
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

secrets:
  hyperliquid_private_key:
    external: true

volumes:
  redis_data:
```

### Blue-Green Deployment

```bash
#!/bin/bash
# deploy.sh - Zero-downtime deployment
NEW_VERSION=$1
CURRENT=$(docker-compose ps -q hl-eco-mcp | head -1)

# Start new version
docker-compose -f docker-compose.blue.yml up -d

# Health check
for i in {1..30}; do
  if curl -f http://localhost:3001/tools/health_check; then
    echo "New version healthy"
    break
  fi
  sleep 2
done

# Switch traffic
nginx -s reload

# Stop old version
docker stop $CURRENT
```

## 🛠️ Troubleshooting Playbooks

### Common Issues & Solutions

#### HyperLiquid API Issues

```bash
# Symptom: HyperLiquid tools failing
# Check adapter health
curl http://localhost:3000/tools/hyperliquid_health_check

# Enable mock mode for testing
MOCK_EXTERNAL_APIS=true hl-eco-mcp

# Check API credentials
echo $HYPERLIQUID_PRIVATE_KEY | head -c 10
```

#### Rate Limiting

```bash
# Symptom: "Rate limit exceeded" errors
# Increase rate limits
export API_RATE_LIMIT_REQUESTS_PER_MINUTE=300

# Check current usage
curl http://localhost:3000/metrics | grep rate_limit

# Enable request queuing
export ENABLE_REQUEST_QUEUING=true
```

#### WebSocket Disconnections

```bash
# Check WebSocket status
curl http://localhost:3000/tools/hyperliquid_websocket_status

# Manual reconnection
curl -X POST http://localhost:3000/admin/websocket/reconnect

# Adjust reconnection settings
export WEBSOCKET_RECONNECT_DELAY_MS=5000
```

#### Memory Leaks

```bash
# Monitor memory usage
ps aux | grep hl-eco-mcp

# Enable heap dumps
export NODE_OPTIONS="--max-old-space-size=2048 --heapdump-on-out-of-memory"

# Graceful restart
kill -SIGUSR2 $PID  # Triggers graceful shutdown
```

### Emergency Procedures

#### Service Recovery

1. **Check health endpoints** - Determine scope of issue
2. **Review recent logs** - Identify root cause
3. **Enable mock mode** - Maintain availability during outages
4. **Scale horizontally** - Add instances if load-related
5. **Rollback if needed** - Use previous known-good version

#### Incident Response

1. **Acknowledge** - Update status page, notify stakeholders
2. **Investigate** - Use monitoring dashboards and logs
3. **Mitigate** - Apply immediate fixes or workarounds
4. **Resolve** - Deploy permanent solution
5. **Post-mortem** - Document lessons learned

---

**📞 Need Help?** Check our [troubleshooting guide](troubleshooting.md) or [open an issue](https://github.com/khrafts/hyper-mcp/issues) for support.
