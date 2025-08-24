import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { HyperLiquidNodeInfoAdapter } from '../adapters/hyperliquid/HyperLiquidNodeInfoAdapter.js';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('NODE_INFO_TOOLS');

export class NodeInfoTools {
  private nodeInfoAdapter: HyperLiquidNodeInfoAdapter;

  constructor(nodeInfoAdapter: HyperLiquidNodeInfoAdapter) {
    this.nodeInfoAdapter = nodeInfoAdapter;
  }

  getToolDefinitions() {
    return [
      {
        name: 'node_get_status',
        description: 'Get detailed status information for a HyperLiquid network node',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'Specific node ID to query (optional, uses default node if not provided)',
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'node_get_network_stats',
        description: 'Get comprehensive HyperLiquid network statistics and health metrics',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'node_get_validators',
        description: 'Get information about HyperLiquid network validators',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination',
              minimum: 1,
              default: 1,
            },
            limit: {
              type: 'number',
              description: 'Number of validators per page',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'node_get_chain_metrics',
        description: 'Get blockchain metrics including height, transactions, and volume',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'node_get_network_health',
        description: 'Perform comprehensive network health assessment',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'node_monitor_performance',
        description: 'Get real-time node performance metrics and alerts',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'Node ID to monitor (optional)',
            },
            includeAlerts: {
              type: 'boolean',
              description: 'Include performance alerts in response',
              default: true,
            },
          },
          additionalProperties: false,
        },
      },
    ];
  }

  async handleToolCall(name: string, args: unknown): Promise<CallToolResult> {
    try {
      logger.info('Handling node info tool call', { tool: name, args });

      switch (name) {
        case 'node_get_status':
          return await this.getNodeStatus(args);

        case 'node_get_network_stats':
          return await this.getNetworkStats();

        case 'node_get_validators':
          return await this.getValidators(args);

        case 'node_get_chain_metrics':
          return await this.getChainMetrics();

        case 'node_get_network_health':
          return await this.getNetworkHealth();

        case 'node_monitor_performance':
          return await this.monitorPerformance(args);

        default:
          throw new Error(`Unknown node info tool: ${name}`);
      }
    } catch (error) {
      logger.error('Node info tool call failed', { tool: name, error });

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          },
        ],
      };
    }
  }

  private async getNodeStatus(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      nodeId: z.string().optional(),
    });

    const parsed = schema.parse(args);

    try {
      const nodeStatus = await this.nodeInfoAdapter.getNodeStatus(parsed.nodeId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_node_status',
                nodeStatus: {
                  nodeId: nodeStatus.nodeId,
                  version: nodeStatus.version,
                  network: nodeStatus.network,
                  sync: {
                    status: nodeStatus.syncStatus.isSynced ? 'synced' : 'syncing',
                    progress: `${nodeStatus.syncStatus.syncProgress.toFixed(2)}%`,
                    currentBlock: nodeStatus.syncStatus.currentBlock.toLocaleString(),
                    targetBlock: nodeStatus.syncStatus.targetBlock.toLocaleString(),
                    blocksBehind: nodeStatus.syncStatus.targetBlock - nodeStatus.syncStatus.currentBlock,
                  },
                  connectivity: {
                    connectedPeers: nodeStatus.peers.connected,
                    totalPeers: nodeStatus.peers.total,
                    connectionRatio: `${((nodeStatus.peers.connected / nodeStatus.peers.total) * 100).toFixed(1)}%`,
                  },
                  performance: {
                    blocksPerSecond: nodeStatus.performance.blocksPerSecond.toFixed(2),
                    transactionsPerSecond: nodeStatus.performance.transactionsPerSecond.toFixed(0),
                    cpuUsage: `${nodeStatus.performance.cpuUsage.toFixed(1)}%`,
                    memoryUsage: `${nodeStatus.performance.memoryUsage.toFixed(1)}%`,
                  },
                  uptime: {
                    seconds: nodeStatus.uptime,
                    formatted: this.formatUptime(nodeStatus.uptime),
                  },
                },
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_node_status',
                nodeId: parsed.nodeId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async getNetworkStats(): Promise<CallToolResult> {
    try {
      const networkStats = await this.nodeInfoAdapter.getNetworkStats();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_network_stats',
                networkStats: {
                  nodes: {
                    total: networkStats.totalNodes,
                    active: networkStats.activeNodes,
                    activeRatio: `${((networkStats.activeNodes / networkStats.totalNodes) * 100).toFixed(1)}%`,
                  },
                  performance: {
                    networkHashRate: networkStats.networkHashRate,
                    averageBlockTime: `${networkStats.averageBlockTime}s`,
                    networkDifficulty: networkStats.networkDifficulty,
                  },
                  transactions: {
                    processed24h: networkStats.totalTransactions24h.toLocaleString(),
                    averagePerSecond: Math.round(networkStats.totalTransactions24h / 86400),
                  },
                  consensus: {
                    status: networkStats.consensusStatus,
                    statusDescription: this.getConsensusDescription(networkStats.consensusStatus),
                  },
                },
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_network_stats',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async getValidators(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(50),
    });

    const parsed = schema.parse(args);

    try {
      const validatorsData = await this.nodeInfoAdapter.getValidators(parsed.page, parsed.limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_validators',
                validators: validatorsData.validators.map(validator => ({
                  address: validator.address,
                  moniker: validator.moniker,
                  status: validator.status,
                  votingPower: {
                    amount: validator.votingPower.toLocaleString(),
                    percentage: '0.125%', // Would calculate from total
                  },
                  commission: `${(validator.commission * 100).toFixed(2)}%`,
                  performance: {
                    uptime: `${validator.uptime.toFixed(2)}%`,
                    blocksProposed: validator.blocks.proposed,
                    blocksMissed: validator.blocks.missed,
                    missedRatio: validator.blocks.proposed > 0 
                      ? `${((validator.blocks.missed / (validator.blocks.proposed + validator.blocks.missed)) * 100).toFixed(2)}%`
                      : '0%',
                  },
                  delegations: {
                    selfDelegation: validator.delegations.self.toLocaleString(),
                    totalDelegation: validator.delegations.total.toLocaleString(),
                    selfRatio: `${((validator.delegations.self / validator.delegations.total) * 100).toFixed(1)}%`,
                  },
                })),
                pagination: {
                  currentPage: validatorsData.pagination.currentPage,
                  totalPages: validatorsData.pagination.totalPages,
                  totalValidators: validatorsData.pagination.totalValidators,
                  hasNextPage: validatorsData.pagination.currentPage < validatorsData.pagination.totalPages,
                  hasPreviousPage: validatorsData.pagination.currentPage > 1,
                },
                summary: {
                  displayedCount: validatorsData.validators.length,
                  totalActiveValidators: validatorsData.validators.filter(v => v.status === 'active').length,
                  averageCommission: `${(validatorsData.validators.reduce((sum, v) => sum + v.commission, 0) / validatorsData.validators.length * 100).toFixed(2)}%`,
                },
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_validators',
                page: parsed.page,
                limit: parsed.limit,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async getChainMetrics(): Promise<CallToolResult> {
    try {
      const chainMetrics = await this.nodeInfoAdapter.getChainMetrics();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_chain_metrics',
                chainMetrics: {
                  blockchain: {
                    currentHeight: chainMetrics.height.toLocaleString(),
                    averageBlockTime: `${chainMetrics.blockTime}s`,
                    estimatedDailyBlocks: Math.round(86400 / chainMetrics.blockTime),
                  },
                  transactions: {
                    total: chainMetrics.transactions.total.toLocaleString(),
                    pending: chainMetrics.transactions.pending.toLocaleString(),
                    processed24h: chainMetrics.transactions.processed24h.toLocaleString(),
                    averagePerBlock: Math.round(chainMetrics.transactions.processed24h / (86400 / chainMetrics.blockTime)),
                    throughputTPS: Math.round(chainMetrics.transactions.processed24h / 86400),
                  },
                  accounts: {
                    total: chainMetrics.accounts.total.toLocaleString(),
                    active24h: chainMetrics.accounts.active24h.toLocaleString(),
                    activityRatio: `${((chainMetrics.accounts.active24h / chainMetrics.accounts.total) * 100).toFixed(2)}%`,
                  },
                  volume: {
                    volume24h: `$${(chainMetrics.volume.total24h / 1000000).toFixed(2)}M`,
                    totalVolume: `$${(chainMetrics.volume.totalAllTime / 1000000000).toFixed(2)}B`,
                    averageTransactionValue: `$${(chainMetrics.volume.total24h / chainMetrics.transactions.processed24h).toFixed(2)}`,
                  },
                },
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_chain_metrics',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async getNetworkHealth(): Promise<CallToolResult> {
    try {
      const healthReport = await this.nodeInfoAdapter.getNetworkHealth();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_network_health',
                healthReport: {
                  overallStatus: healthReport.status,
                  healthScore: `${healthReport.score}/100`,
                  statusDescription: this.getHealthDescription(healthReport.status),
                  issues: healthReport.issues.length > 0 ? healthReport.issues : ['No issues detected'],
                  issueCount: healthReport.issues.length,
                  recommendations: this.generateHealthRecommendations(healthReport),
                  lastAssessment: healthReport.lastChecked.toISOString(),
                },
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'get_network_health',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private async monitorPerformance(args: unknown): Promise<CallToolResult> {
    const schema = z.object({
      nodeId: z.string().optional(),
      includeAlerts: z.boolean().default(true),
    });

    const parsed = schema.parse(args);

    try {
      const [nodeStatus, networkHealth] = await Promise.all([
        this.nodeInfoAdapter.getNodeStatus(parsed.nodeId),
        this.nodeInfoAdapter.getNetworkHealth(),
      ]);

      const performanceAlerts = parsed.includeAlerts ? this.generatePerformanceAlerts(nodeStatus) : [];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'monitor_node_performance',
                nodeId: nodeStatus.nodeId,
                performance: {
                  sync: {
                    status: nodeStatus.syncStatus.isSynced ? 'healthy' : 'warning',
                    progress: nodeStatus.syncStatus.syncProgress,
                    blocksBehind: nodeStatus.syncStatus.targetBlock - nodeStatus.syncStatus.currentBlock,
                  },
                  resources: {
                    cpu: {
                      usage: nodeStatus.performance.cpuUsage,
                      status: nodeStatus.performance.cpuUsage < 80 ? 'healthy' : nodeStatus.performance.cpuUsage < 95 ? 'warning' : 'critical',
                    },
                    memory: {
                      usage: nodeStatus.performance.memoryUsage,
                      status: nodeStatus.performance.memoryUsage < 80 ? 'healthy' : nodeStatus.performance.memoryUsage < 90 ? 'warning' : 'critical',
                    },
                  },
                  connectivity: {
                    peers: nodeStatus.peers.connected,
                    status: nodeStatus.peers.connected >= 10 ? 'healthy' : nodeStatus.peers.connected >= 5 ? 'warning' : 'critical',
                  },
                  throughput: {
                    blocksPerSecond: nodeStatus.performance.blocksPerSecond,
                    transactionsPerSecond: nodeStatus.performance.transactionsPerSecond,
                  },
                },
                networkOverall: {
                  healthStatus: networkHealth.status,
                  healthScore: networkHealth.score,
                },
                alerts: performanceAlerts,
                alertCount: performanceAlerts.length,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'monitor_node_performance',
                nodeId: parsed.nodeId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  }

  private getConsensusDescription(status: string): string {
    switch (status) {
      case 'stable': return 'Network consensus is operating normally with consistent block production';
      case 'unstable': return 'Network consensus is experiencing minor issues but remains functional';
      case 'degraded': return 'Network consensus is significantly impacted with potential delays';
      default: return 'Unknown consensus status';
    }
  }

  private getHealthDescription(status: string): string {
    switch (status) {
      case 'healthy': return 'Network is operating optimally with no significant issues';
      case 'degraded': return 'Network has some performance issues but remains functional';
      case 'unhealthy': return 'Network is experiencing significant problems affecting operation';
      default: return 'Unknown health status';
    }
  }

  private generateHealthRecommendations(healthReport: any): string[] {
    const recommendations: string[] = [];
    
    if (healthReport.score < 50) {
      recommendations.push('Consider restarting affected nodes or checking network connectivity');
    }
    
    if (healthReport.issues.some((issue: string) => issue.includes('CPU'))) {
      recommendations.push('Monitor CPU usage and consider scaling resources if sustained');
    }
    
    if (healthReport.issues.some((issue: string) => issue.includes('memory'))) {
      recommendations.push('Check for memory leaks and consider increasing available memory');
    }
    
    if (healthReport.issues.some((issue: string) => issue.includes('peer'))) {
      recommendations.push('Check firewall settings and network connectivity to improve peer connections');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring network performance and maintain current configuration');
    }
    
    return recommendations;
  }

  private generatePerformanceAlerts(nodeStatus: any): Array<{
    type: string;
    severity: string;
    message: string;
    metric: string;
    value: number | string;
  }> {
    const alerts: Array<{
      type: string;
      severity: string;
      message: string;
      metric: string;
      value: number | string;
    }> = [];

    if (!nodeStatus.syncStatus.isSynced) {
      alerts.push({
        type: 'sync',
        severity: 'warning',
        message: 'Node is not fully synchronized with the network',
        metric: 'sync_progress',
        value: `${nodeStatus.syncStatus.syncProgress.toFixed(2)}%`,
      });
    }

    if (nodeStatus.performance.cpuUsage > 90) {
      alerts.push({
        type: 'resource',
        severity: 'critical',
        message: 'CPU usage is critically high',
        metric: 'cpu_usage',
        value: `${nodeStatus.performance.cpuUsage.toFixed(1)}%`,
      });
    } else if (nodeStatus.performance.cpuUsage > 80) {
      alerts.push({
        type: 'resource',
        severity: 'warning',
        message: 'CPU usage is elevated',
        metric: 'cpu_usage',
        value: `${nodeStatus.performance.cpuUsage.toFixed(1)}%`,
      });
    }

    if (nodeStatus.performance.memoryUsage > 85) {
      alerts.push({
        type: 'resource',
        severity: 'critical',
        message: 'Memory usage is critically high',
        metric: 'memory_usage',
        value: `${nodeStatus.performance.memoryUsage.toFixed(1)}%`,
      });
    }

    if (nodeStatus.peers.connected < 5) {
      alerts.push({
        type: 'connectivity',
        severity: 'critical',
        message: 'Very low peer connectivity detected',
        metric: 'connected_peers',
        value: nodeStatus.peers.connected,
      });
    } else if (nodeStatus.peers.connected < 10) {
      alerts.push({
        type: 'connectivity',
        severity: 'warning',
        message: 'Low peer connectivity detected',
        metric: 'connected_peers',
        value: nodeStatus.peers.connected,
      });
    }

    return alerts;
  }
}