# Network Monitoring Tools

This section covers all 6 network monitoring and node information tools for blockchain infrastructure monitoring.

## Overview

The Node Info integration provides comprehensive network monitoring capabilities:

- **Node Status** - Health and connectivity monitoring
- **Network Metrics** - Performance and statistics tracking
- **Validator Information** - Validator set and staking data
- **Chain Metrics** - Blockchain state and progression
- **Performance Monitoring** - Real-time performance analysis

## Available Tools

### Core Monitoring (3 tools)

- [**get_status**](node_get_status.md) - Get current node status and connectivity
- [**get_network_stats**](node_get_network_stats.md) - Get network-wide statistics and metrics
- [**get_network_health**](node_get_network_health.md) - Assess overall network health

### Blockchain Data (2 tools)

- [**get_validators**](node_get_validators.md) - Get validator set and staking information
- [**get_chain_metrics**](node_get_chain_metrics.md) - Get blockchain metrics and state

### Performance Analysis (1 tool)

- [**monitor_performance**](node_monitor_performance.md) - Real-time performance monitoring

## Configuration

All network monitoring tools work in read-only mode without requiring API keys or authentication.

## Usage Examples

### Network Health Check

```
Check the current network health and node status
```

### Validator Monitoring

```
Show me the current validator set and their staking amounts
```

### Performance Analysis

```
What are the current network performance metrics?
```

### Chain Analysis

```
Get blockchain metrics including block height and transaction throughput
```

## Use Cases

### Infrastructure Monitoring

- Monitor node connectivity and health
- Track network performance metrics
- Alert on validator changes or issues

### Research & Analytics

- Analyze network growth and adoption
- Study validator behavior and economics
- Track chain progression and metrics

### Development & Testing

- Verify network connectivity for applications
- Monitor performance during load testing
- Validate infrastructure deployments

For more information, see the [Network Monitoring Integration Guide](../integrations/node-info.md).
