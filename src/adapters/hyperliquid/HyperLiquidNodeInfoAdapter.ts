import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createComponentLogger } from '../../utils/logger.js';

const logger = createComponentLogger('HYPERLIQUID_NODE_INFO');

export interface NodeInfoConfig {
  name: string;
  baseUrl: string;
  timeout: number;
}

export interface NodeStatus {
  nodeId: string;
  version: string;
  network: string;
  syncStatus: {
    isSynced: boolean;
    currentBlock: number;
    targetBlock: number;
    syncProgress: number;
  };
  peers: {
    connected: number;
    total: number;
  };
  performance: {
    blocksPerSecond: number;
    transactionsPerSecond: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  uptime: number;
  lastUpdateTime: Date;
}

export interface NetworkStats {
  totalNodes: number;
  activeNodes: number;
  networkHashRate: string;
  averageBlockTime: number;
  totalTransactions24h: number;
  networkDifficulty: string;
  consensusStatus: 'stable' | 'unstable' | 'degraded';
}

export interface ValidatorInfo {
  address: string;
  moniker: string;
  votingPower: number;
  commission: number;
  status: 'active' | 'inactive' | 'jailed';
  uptime: number;
  blocks: {
    proposed: number;
    missed: number;
  };
  delegations: {
    self: number;
    total: number;
  };
}

export interface ChainMetrics {
  height: number;
  blockTime: number;
  transactions: {
    total: number;
    pending: number;
    processed24h: number;
  };
  accounts: {
    total: number;
    active24h: number;
  };
  volume: {
    total24h: number;
    totalAllTime: number;
  };
}

export class HyperLiquidNodeInfoAdapter {
  private config: NodeInfoConfig;
  private httpClient: AxiosInstance;
  private nodeCache: Map<string, NodeStatus> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  constructor(config: NodeInfoConfig) {
    this.config = config;
    
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HyperLiquid-NodeInfo-MCP/1.0.0',
      },
    });

    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Node info API request failed', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        throw error;
      }
    );

    logger.info('HyperLiquidNodeInfoAdapter initialized', { 
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout 
    });
  }

  async getNodeStatus(nodeId?: string): Promise<NodeStatus> {
    try {
      const targetNodeId = nodeId || 'default';
      
      // Check cache first
      const cached = this.nodeCache.get(targetNodeId);
      if (cached && Date.now() - cached.lastUpdateTime.getTime() < this.cacheTimeout) {
        return cached;
      }

      const response: AxiosResponse<any> = await this.httpClient.post('', {
        type: 'nodeStatus',
        nodeId: targetNodeId,
      });

      const nodeStatus = this.parseNodeStatus(response.data, targetNodeId);
      
      // Cache the result
      this.nodeCache.set(targetNodeId, nodeStatus);
      
      logger.info('Node status retrieved', { 
        nodeId: targetNodeId, 
        syncStatus: nodeStatus.syncStatus.isSynced 
      });

      return nodeStatus;
    } catch (error) {
      logger.error('Failed to get node status', { nodeId, error });
      throw error;
    }
  }

  async getNetworkStats(): Promise<NetworkStats> {
    try {
      const response: AxiosResponse<any> = await this.httpClient.post('', {
        type: 'networkStats',
      });

      const networkStats = this.parseNetworkStats(response.data);
      
      logger.info('Network stats retrieved', { 
        totalNodes: networkStats.totalNodes,
        consensusStatus: networkStats.consensusStatus 
      });

      return networkStats;
    } catch (error) {
      logger.error('Failed to get network stats', { error });
      throw error;
    }
  }

  async getValidators(page: number = 1, limit: number = 50): Promise<{
    validators: ValidatorInfo[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalValidators: number;
    };
  }> {
    try {
      const response: AxiosResponse<any> = await this.httpClient.post('', {
        type: 'validators',
        page,
        limit,
      });

      const validatorsData = this.parseValidators(response.data);
      
      logger.info('Validators data retrieved', { 
        page, 
        count: validatorsData.validators.length 
      });

      return validatorsData;
    } catch (error) {
      logger.error('Failed to get validators', { page, limit, error });
      throw error;
    }
  }

  async getChainMetrics(): Promise<ChainMetrics> {
    try {
      const response: AxiosResponse<any> = await this.httpClient.post('', {
        type: 'chainMetrics',
      });

      const chainMetrics = this.parseChainMetrics(response.data);
      
      logger.info('Chain metrics retrieved', { 
        height: chainMetrics.height,
        transactions24h: chainMetrics.transactions.processed24h 
      });

      return chainMetrics;
    } catch (error) {
      logger.error('Failed to get chain metrics', { error });
      throw error;
    }
  }

  async getNetworkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    score: number;
    issues: string[];
    lastChecked: Date;
  }> {
    try {
      const [nodeStatus, networkStats, chainMetrics] = await Promise.all([
        this.getNodeStatus().catch(() => null),
        this.getNetworkStats().catch(() => null),
        this.getChainMetrics().catch(() => null),
      ]);

      let score = 100;
      const issues: string[] = [];

      // Node sync check
      if (!nodeStatus?.syncStatus.isSynced) {
        score -= 20;
        issues.push('Node is not synchronized');
      }

      // Network consensus check
      if (networkStats?.consensusStatus !== 'stable') {
        score -= 15;
        issues.push(`Network consensus is ${networkStats?.consensusStatus || 'unknown'}`);
      }

      // Performance checks
      if (nodeStatus && nodeStatus.performance.cpuUsage > 90) {
        score -= 10;
        issues.push('High CPU usage detected');
      }

      if (nodeStatus && nodeStatus.performance.memoryUsage > 85) {
        score -= 10;
        issues.push('High memory usage detected');
      }

      // Connectivity check
      if (nodeStatus && nodeStatus.peers.connected < 5) {
        score -= 15;
        issues.push('Low peer connectivity');
      }

      // Block production check
      if (chainMetrics && chainMetrics.blockTime > 10) {
        score -= 10;
        issues.push('Slow block production detected');
      }

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (score >= 80) status = 'healthy';
      else if (score >= 50) status = 'degraded';
      else status = 'unhealthy';

      const healthReport = {
        status,
        score,
        issues,
        lastChecked: new Date(),
      };

      logger.info('Network health assessment completed', { 
        status: healthReport.status, 
        score: healthReport.score,
        issueCount: issues.length 
      });

      return healthReport;
    } catch (error) {
      logger.error('Failed to assess network health', { error });
      return {
        status: 'unhealthy' as const,
        score: 0,
        issues: ['Health check failed due to system error'],
        lastChecked: new Date(),
      };
    }
  }

  private parseNodeStatus(data: any, nodeId: string): NodeStatus {
    // Mock implementation - would parse actual HyperLiquid node response
    return {
      nodeId,
      version: data?.version || '1.0.0',
      network: data?.network || 'hyperliquid-mainnet',
      syncStatus: {
        isSynced: data?.sync?.synced ?? true,
        currentBlock: data?.sync?.currentBlock || 12345678,
        targetBlock: data?.sync?.targetBlock || 12345678,
        syncProgress: data?.sync?.progress || 100,
      },
      peers: {
        connected: data?.peers?.connected || 25,
        total: data?.peers?.total || 50,
      },
      performance: {
        blocksPerSecond: data?.performance?.bps || 0.5,
        transactionsPerSecond: data?.performance?.tps || 100,
        memoryUsage: data?.performance?.memory || 45.5,
        cpuUsage: data?.performance?.cpu || 23.2,
      },
      uptime: data?.uptime || Date.now() - 86400000, // 24 hours
      lastUpdateTime: new Date(),
    };
  }

  private parseNetworkStats(data: any): NetworkStats {
    // Mock implementation - would parse actual network stats
    return {
      totalNodes: data?.nodes?.total || 1000,
      activeNodes: data?.nodes?.active || 850,
      networkHashRate: data?.hashRate || '1.5 EH/s',
      averageBlockTime: data?.blockTime || 2.1,
      totalTransactions24h: data?.transactions?.day || 125000,
      networkDifficulty: data?.difficulty || '25.5T',
      consensusStatus: data?.consensus?.status || 'stable',
    };
  }

  private parseValidators(data: any): {
    validators: ValidatorInfo[];
    pagination: { currentPage: number; totalPages: number; totalValidators: number };
  } {
    // Mock implementation - would parse actual validator data
    const validators: ValidatorInfo[] = [
      {
        address: 'hyperval1abc123...',
        moniker: 'HyperValidator1',
        votingPower: 1250000,
        commission: 0.05,
        status: 'active',
        uptime: 99.8,
        blocks: {
          proposed: 1234,
          missed: 2,
        },
        delegations: {
          self: 500000,
          total: 1250000,
        },
      },
      {
        address: 'hyperval1def456...',
        moniker: 'StakePool Pro',
        votingPower: 980000,
        commission: 0.08,
        status: 'active',
        uptime: 99.5,
        blocks: {
          proposed: 987,
          missed: 5,
        },
        delegations: {
          self: 100000,
          total: 980000,
        },
      },
    ];

    return {
      validators,
      pagination: {
        currentPage: data?.page || 1,
        totalPages: data?.totalPages || 10,
        totalValidators: data?.total || 200,
      },
    };
  }

  private parseChainMetrics(data: any): ChainMetrics {
    // Mock implementation - would parse actual chain metrics
    return {
      height: data?.height || 12345678,
      blockTime: data?.blockTime || 2.1,
      transactions: {
        total: data?.transactions?.total || 50000000,
        pending: data?.transactions?.pending || 150,
        processed24h: data?.transactions?.day || 125000,
      },
      accounts: {
        total: data?.accounts?.total || 250000,
        active24h: data?.accounts?.active || 12500,
      },
      volume: {
        total24h: data?.volume?.day || 125000000,
        totalAllTime: data?.volume?.total || 25000000000,
      },
    };
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    details: Record<string, unknown>;
  }> {
    try {
      const startTime = Date.now();
      await this.httpClient.post('', { type: 'ping' });
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        details: {
          responseTime,
          baseUrl: this.config.baseUrl,
          lastCheck: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          baseUrl: this.config.baseUrl,
          lastCheck: new Date().toISOString(),
        },
      };
    }
  }

  getMetadata(): Record<string, unknown> {
    return {
      name: this.config.name,
      type: 'node_info',
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      features: [
        'node_status',
        'network_stats', 
        'validator_info',
        'chain_metrics',
        'health_monitoring',
      ],
    };
  }

  async disconnect(): Promise<void> {
    this.nodeCache.clear();
    logger.info('HyperLiquidNodeInfoAdapter disconnected');
  }
}