import { NodeInfoTools } from '../../src/tools/NodeInfoTools.js';
import { HyperLiquidNodeInfoAdapter } from '../../src/adapters/hyperliquid/HyperLiquidNodeInfoAdapter.js';

jest.mock('../../src/utils/logger.js', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('NodeInfoTools', () => {
  let tools: NodeInfoTools;
  let mockAdapter: jest.Mocked<HyperLiquidNodeInfoAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdapter = {
      getNodeStatus: jest.fn(),
      getNetworkStats: jest.fn(),
      getValidators: jest.fn(),
      getChainMetrics: jest.fn(),
      getNetworkHealth: jest.fn(),
    } as any;

    tools = new NodeInfoTools(mockAdapter);
  });

  describe('getToolDefinitions', () => {
    it('should return all tool definitions', () => {
      const definitions = tools.getToolDefinitions();

      expect(definitions).toHaveLength(6);
      expect(definitions[0]?.name).toBe('node_get_status');
      expect(definitions[1]?.name).toBe('node_get_network_stats');
      expect(definitions[2]?.name).toBe('node_get_validators');
      expect(definitions[3]?.name).toBe('node_get_chain_metrics');
      expect(definitions[4]?.name).toBe('node_get_network_health');
      expect(definitions[5]?.name).toBe('node_monitor_performance');
    });

    it('should have correct schema for node_get_status', () => {
      const definitions = tools.getToolDefinitions();
      const statusTool = definitions[0]!;

      expect(statusTool.inputSchema.type).toBe('object');
      expect(statusTool.inputSchema.properties.nodeId).toBeDefined();
      expect((statusTool.inputSchema as any).required).toBeUndefined();
    });

    it('should have correct schema for node_get_validators', () => {
      const definitions = tools.getToolDefinitions();
      const validatorsTool = definitions[2]!;

      expect(validatorsTool.inputSchema.type).toBe('object');
      expect(validatorsTool.inputSchema.properties.page).toBeDefined();
      expect(validatorsTool.inputSchema.properties.limit).toBeDefined();
      expect((validatorsTool.inputSchema.properties.page as any).minimum).toBe(1);
      expect((validatorsTool.inputSchema.properties.limit as any).maximum).toBe(100);
    });

    it('should have correct schema for node_monitor_performance', () => {
      const definitions = tools.getToolDefinitions();
      const monitorTool = definitions[5]!;

      expect(monitorTool.inputSchema.type).toBe('object');
      expect(monitorTool.inputSchema.properties.nodeId).toBeDefined();
      expect(monitorTool.inputSchema.properties.includeAlerts).toBeDefined();
      expect((monitorTool.inputSchema.properties.includeAlerts as any).default).toBe(true);
    });
  });

  describe('handleToolCall', () => {
    describe('node_get_status', () => {
      const mockNodeStatus = {
        nodeId: 'node-123',
        version: '1.2.3',
        network: 'mainnet',
        syncStatus: {
          isSynced: true,
          syncProgress: 100,
          currentBlock: 1000000,
          targetBlock: 1000000,
        },
        peers: {
          connected: 15,
          total: 20,
        },
        performance: {
          blocksPerSecond: 2.5,
          transactionsPerSecond: 100,
          cpuUsage: 45.5,
          memoryUsage: 62.3,
        },
        uptime: 3661000, // 1h 1m 1s
        lastUpdateTime: new Date(),
      };

      beforeEach(() => {
        mockAdapter.getNodeStatus.mockResolvedValue(mockNodeStatus);
      });

      it('should get node status successfully', async () => {
        const result = await tools.handleToolCall('node_get_status', { nodeId: 'node-123' });

        expect(mockAdapter.getNodeStatus).toHaveBeenCalledWith('node-123');
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('get_node_status');
        expect(content.nodeStatus.nodeId).toBe('node-123');
        expect(content.nodeStatus.sync.status).toBe('synced');
        expect(content.nodeStatus.sync.progress).toBe('100.00%');
        expect(content.nodeStatus.performance.cpuUsage).toBe('45.5%');
        expect(content.nodeStatus.uptime.formatted).toBe('0d 1h 1m');
      });

      it('should get node status without nodeId', async () => {
        const result = await tools.handleToolCall('node_get_status', {});

        expect(mockAdapter.getNodeStatus).toHaveBeenCalledWith(undefined);
        expect(result.isError).toBeUndefined();
      });

      it('should handle syncing status', async () => {
        mockAdapter.getNodeStatus.mockResolvedValue({
          ...mockNodeStatus,
          syncStatus: {
            isSynced: false,
            syncProgress: 85.5,
            currentBlock: 850000,
            targetBlock: 1000000,
          },
        });

        const result = await tools.handleToolCall('node_get_status', {});

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.nodeStatus.sync.status).toBe('syncing');
        expect(content.nodeStatus.sync.blocksBehind).toBe(150000);
      });

      it('should handle errors in node status', async () => {
        const error = new Error('Node unreachable');
        mockAdapter.getNodeStatus.mockRejectedValue(error);

        const result = await tools.handleToolCall('node_get_status', { nodeId: 'node-123' });

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBe('Node unreachable');
      });

      it('should format uptime correctly for various durations', async () => {
        const testCases = [
          { uptime: 86400000, expected: '1d 0h 0m' }, // 1 day
          { uptime: 90061000, expected: '1d 1h 1m' }, // 1d 1h 1m 1s
          { uptime: 259200000, expected: '3d 0h 0m' }, // 3 days
          { uptime: 3600000, expected: '0d 1h 0m' }, // 1 hour
          { uptime: 60000, expected: '0d 0h 1m' }, // 1 minute
        ];

        for (const testCase of testCases) {
          mockAdapter.getNodeStatus.mockResolvedValue({
            ...mockNodeStatus,
            uptime: testCase.uptime,
          });

          const result = await tools.handleToolCall('node_get_status', {});
          const content = JSON.parse((result.content[0] as any).text);
          expect(content.nodeStatus.uptime.formatted).toBe(testCase.expected);
        }
      });
    });

    describe('node_get_network_stats', () => {
      const mockNetworkStats = {
        totalNodes: 100,
        activeNodes: 95,
        networkHashRate: '1000 TH/s',
        averageBlockTime: 2,
        networkDifficulty: '5000000',
        totalTransactions24h: 1000000,
        consensusStatus: 'stable' as 'stable' | 'unstable' | 'degraded',
      };

      beforeEach(() => {
        mockAdapter.getNetworkStats.mockResolvedValue(mockNetworkStats);
      });

      it('should get network stats successfully', async () => {
        const result = await tools.handleToolCall('node_get_network_stats', {});

        expect(mockAdapter.getNetworkStats).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('get_network_stats');
        expect(content.networkStats.nodes.total).toBe(100);
        expect(content.networkStats.nodes.activeRatio).toBe('95.0%');
        expect(content.networkStats.transactions.averagePerSecond).toBe(12);
        expect(content.networkStats.consensus.statusDescription).toContain('operating normally');
      });

      it('should handle different consensus statuses', async () => {
        const statuses: Array<'stable' | 'unstable' | 'degraded'> = [
          'stable',
          'unstable',
          'degraded',
        ];

        for (const status of statuses) {
          mockAdapter.getNetworkStats.mockResolvedValue({
            ...mockNetworkStats,
            consensusStatus: status,
          });

          const result = await tools.handleToolCall('node_get_network_stats', {});
          const content = JSON.parse((result.content[0] as any).text);
          expect(content.networkStats.consensus.status).toBe(status);
          expect(content.networkStats.consensus.statusDescription).toBeDefined();
        }
      });

      it('should handle errors in network stats', async () => {
        const error = new Error('Network stats unavailable');
        mockAdapter.getNetworkStats.mockRejectedValue(error);

        const result = await tools.handleToolCall('node_get_network_stats', {});

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBe('Network stats unavailable');
      });
    });

    describe('node_get_validators', () => {
      const mockValidators = {
        validators: [
          {
            address: 'validator1',
            moniker: 'Validator One',
            status: 'active' as 'active' | 'inactive' | 'jailed',
            votingPower: 1000000,
            commission: 0.05,
            uptime: 99.9,
            blocks: { proposed: 1000, missed: 10 },
            delegations: { self: 100000, total: 1000000 },
          },
          {
            address: 'validator2',
            moniker: 'Validator Two',
            status: 'inactive' as 'active' | 'inactive' | 'jailed',
            votingPower: 500000,
            commission: 0.1,
            uptime: 95.0,
            blocks: { proposed: 500, missed: 50 },
            delegations: { self: 50000, total: 500000 },
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 5,
          totalValidators: 100,
        },
      };

      beforeEach(() => {
        mockAdapter.getValidators.mockResolvedValue(mockValidators);
      });

      it('should get validators successfully', async () => {
        const result = await tools.handleToolCall('node_get_validators', { page: 1, limit: 50 });

        expect(mockAdapter.getValidators).toHaveBeenCalledWith(1, 50);
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('get_validators');
        expect(content.validators).toHaveLength(2);
        expect(content.validators[0].address).toBe('validator1');
        expect(content.validators[0].commission).toBe('5.00%');
        expect(content.validators[0].performance.uptime).toBe('99.90%');
        expect(content.validators[0].performance.missedRatio).toBe('0.99%');
        expect(content.validators[0].delegations.selfRatio).toBe('10.0%');
      });

      it('should handle default pagination', async () => {
        const result = await tools.handleToolCall('node_get_validators', {});

        expect(mockAdapter.getValidators).toHaveBeenCalledWith(1, 50);
        expect(result.isError).toBeUndefined();
      });

      it('should validate pagination limits', async () => {
        const result = await tools.handleToolCall('node_get_validators', {
          page: 0,
          limit: 150,
        });

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });

      it('should calculate summary statistics', async () => {
        const result = await tools.handleToolCall('node_get_validators', {});

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.summary.displayedCount).toBe(2);
        expect(content.summary.totalActiveValidators).toBe(1);
        expect(content.summary.averageCommission).toBe('7.50%');
      });

      it('should handle validators with no proposed blocks', async () => {
        mockAdapter.getValidators.mockResolvedValue({
          ...mockValidators,
          validators: [
            {
              ...mockValidators.validators[0]!,
              blocks: { proposed: 0, missed: 0 },
            },
          ],
          pagination: mockValidators.pagination,
        });

        const result = await tools.handleToolCall('node_get_validators', {});

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.validators[0].performance.missedRatio).toBe('0%');
      });

      it('should handle errors in validators', async () => {
        const error = new Error('Validators unavailable');
        mockAdapter.getValidators.mockRejectedValue(error);

        const result = await tools.handleToolCall('node_get_validators', { page: 1, limit: 50 });

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBe('Validators unavailable');
      });
    });

    describe('node_get_chain_metrics', () => {
      const mockChainMetrics = {
        height: 1000000,
        blockTime: 2,
        transactions: {
          total: 50000000,
          pending: 100,
          processed24h: 1000000,
        },
        accounts: {
          total: 100000,
          active24h: 5000,
        },
        volume: {
          total24h: 10000000,
          totalAllTime: 1000000000,
        },
      };

      beforeEach(() => {
        mockAdapter.getChainMetrics.mockResolvedValue(mockChainMetrics);
      });

      it('should get chain metrics successfully', async () => {
        const result = await tools.handleToolCall('node_get_chain_metrics', {});

        expect(mockAdapter.getChainMetrics).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('get_chain_metrics');
        expect(content.chainMetrics.blockchain.currentHeight).toBe('1,000,000');
        expect(content.chainMetrics.blockchain.estimatedDailyBlocks).toBe(43200);
        expect(content.chainMetrics.transactions.throughputTPS).toBe(12);
        expect(content.chainMetrics.accounts.activityRatio).toBe('5.00%');
        expect(content.chainMetrics.volume.volume24h).toBe('$10.00M');
        expect(content.chainMetrics.volume.totalVolume).toBe('$1.00B');
        expect(content.chainMetrics.volume.averageTransactionValue).toBe('$10.00');
      });

      it('should handle zero transactions', async () => {
        mockAdapter.getChainMetrics.mockResolvedValue({
          ...mockChainMetrics,
          transactions: {
            total: 0,
            pending: 0,
            processed24h: 0,
          },
        });

        const result = await tools.handleToolCall('node_get_chain_metrics', {});

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.chainMetrics.volume.averageTransactionValue).toBe('$Infinity');
      });

      it('should handle errors in chain metrics', async () => {
        const error = new Error('Chain metrics unavailable');
        mockAdapter.getChainMetrics.mockRejectedValue(error);

        const result = await tools.handleToolCall('node_get_chain_metrics', {});

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBe('Chain metrics unavailable');
      });
    });

    describe('node_get_network_health', () => {
      const mockHealthReport = {
        status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
        score: 95,
        issues: [] as string[],
        lastChecked: new Date('2024-01-01T00:00:00Z'),
      };

      beforeEach(() => {
        mockAdapter.getNetworkHealth.mockResolvedValue(mockHealthReport);
      });

      it('should get network health successfully', async () => {
        const result = await tools.handleToolCall('node_get_network_health', {});

        expect(mockAdapter.getNetworkHealth).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('get_network_health');
        expect(content.healthReport.overallStatus).toBe('healthy');
        expect(content.healthReport.healthScore).toBe('95/100');
        expect(content.healthReport.statusDescription).toContain('operating optimally');
        expect(content.healthReport.issues[0]).toBe('No issues detected');
      });

      it('should handle different health statuses', async () => {
        const statuses: Array<'healthy' | 'degraded' | 'unhealthy'> = [
          'healthy',
          'degraded',
          'unhealthy',
        ];

        for (const status of statuses) {
          mockAdapter.getNetworkHealth.mockResolvedValue({
            ...mockHealthReport,
            status,
          });

          const result = await tools.handleToolCall('node_get_network_health', {});
          const content = JSON.parse((result.content[0] as any).text);
          expect(content.healthReport.overallStatus).toBe(status);
          expect(content.healthReport.statusDescription).toBeDefined();
        }
      });

      it('should generate recommendations based on issues', async () => {
        const testCases = [
          {
            issues: ['High CPU usage detected'],
            score: 60,
            expectedRecommendation: 'Monitor CPU usage and consider scaling resources if sustained',
          },
          {
            issues: ['Low memory available'],
            score: 55,
            expectedRecommendation:
              'Check for memory leaks and consider increasing available memory',
          },
          {
            issues: ['Low peer connectivity'],
            score: 65,
            expectedRecommendation:
              'Check firewall settings and network connectivity to improve peer connections',
          },
          {
            issues: [],
            score: 45,
            expectedRecommendation:
              'Consider restarting affected nodes or checking network connectivity',
          },
          {
            issues: [],
            score: 95,
            expectedRecommendation:
              'Continue monitoring network performance and maintain current configuration',
          },
        ];

        for (const testCase of testCases) {
          mockAdapter.getNetworkHealth.mockResolvedValue({
            ...mockHealthReport,
            issues: testCase.issues,
            score: testCase.score,
          });

          const result = await tools.handleToolCall('node_get_network_health', {});
          const content = JSON.parse((result.content[0] as any).text);
          expect(content.healthReport.recommendations).toContain(testCase.expectedRecommendation);
        }
      });

      it('should handle errors in network health', async () => {
        const error = new Error('Health check failed');
        mockAdapter.getNetworkHealth.mockRejectedValue(error);

        const result = await tools.handleToolCall('node_get_network_health', {});

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBe('Health check failed');
      });
    });

    describe('node_monitor_performance', () => {
      const mockNodeStatus = {
        nodeId: 'node-123',
        version: '1.2.3',
        network: 'mainnet',
        syncStatus: {
          isSynced: true,
          syncProgress: 100,
          currentBlock: 1000000,
          targetBlock: 1000000,
        },
        peers: {
          connected: 15,
          total: 20,
        },
        performance: {
          blocksPerSecond: 2.5,
          transactionsPerSecond: 100,
          cpuUsage: 45.5,
          memoryUsage: 62.3,
        },
        uptime: 3600000,
        lastUpdateTime: new Date(),
      };

      const mockHealthReport = {
        status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
        score: 95,
        issues: [] as string[],
        lastChecked: new Date(),
      };

      beforeEach(() => {
        mockAdapter.getNodeStatus.mockResolvedValue(mockNodeStatus);
        mockAdapter.getNetworkHealth.mockResolvedValue(mockHealthReport);
      });

      it('should monitor performance successfully', async () => {
        const result = await tools.handleToolCall('node_monitor_performance', {
          nodeId: 'node-123',
          includeAlerts: true,
        });

        expect(mockAdapter.getNodeStatus).toHaveBeenCalledWith('node-123');
        expect(mockAdapter.getNetworkHealth).toHaveBeenCalled();
        expect(result.isError).toBeUndefined();

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.action).toBe('monitor_node_performance');
        expect(content.nodeId).toBe('node-123');
        expect(content.performance.sync.status).toBe('healthy');
        expect(content.performance.resources.cpu.status).toBe('healthy');
        expect(content.performance.connectivity.status).toBe('healthy');
      });

      it('should generate performance alerts', async () => {
        const criticalStatus = {
          ...mockNodeStatus,
          syncStatus: { ...mockNodeStatus.syncStatus, isSynced: false, syncProgress: 85 },
          performance: { ...mockNodeStatus.performance, cpuUsage: 92, memoryUsage: 88 },
          peers: { connected: 3, total: 20 },
        };

        mockAdapter.getNodeStatus.mockResolvedValue(criticalStatus);

        const result = await tools.handleToolCall('node_monitor_performance', {
          includeAlerts: true,
        });

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.alerts.length).toBeGreaterThan(0);

        const alertTypes = content.alerts.map((a: any) => a.type);
        expect(alertTypes).toContain('sync');
        expect(alertTypes).toContain('resource');
        expect(alertTypes).toContain('connectivity');

        const cpuAlert = content.alerts.find((a: any) => a.metric === 'cpu_usage');
        expect(cpuAlert?.severity).toBe('critical');
        expect(cpuAlert?.message).toContain('critically high');
      });

      it('should handle warning alerts', async () => {
        const warningStatus = {
          ...mockNodeStatus,
          performance: { ...mockNodeStatus.performance, cpuUsage: 82 },
          peers: { connected: 7, total: 20 },
        };

        mockAdapter.getNodeStatus.mockResolvedValue(warningStatus);

        const result = await tools.handleToolCall('node_monitor_performance', {
          includeAlerts: true,
        });

        const content = JSON.parse((result.content[0] as any).text);
        const cpuAlert = content.alerts.find((a: any) => a.metric === 'cpu_usage');
        expect(cpuAlert?.severity).toBe('warning');

        const peerAlert = content.alerts.find((a: any) => a.metric === 'connected_peers');
        expect(peerAlert?.severity).toBe('warning');
      });

      it('should exclude alerts when requested', async () => {
        const result = await tools.handleToolCall('node_monitor_performance', {
          includeAlerts: false,
        });

        const content = JSON.parse((result.content[0] as any).text);
        expect(content.alerts).toEqual([]);
        expect(content.alertCount).toBe(0);
      });

      it('should handle errors in performance monitoring', async () => {
        const error = new Error('Monitoring failed');
        mockAdapter.getNodeStatus.mockRejectedValue(error);

        const result = await tools.handleToolCall('node_monitor_performance', {
          nodeId: 'node-123',
        });

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBe('Monitoring failed');
      });
    });

    describe('error handling', () => {
      it('should handle unknown tool names', async () => {
        const result = await tools.handleToolCall('unknown_tool', {});

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Unknown node info tool');
      });

      it('should handle invalid arguments gracefully', async () => {
        const result = await tools.handleToolCall('node_get_status', null);

        expect(result.isError).toBe(true);
        expect((result.content[0] as any).text).toContain('Error:');
      });

      it('should handle non-Error exceptions', async () => {
        mockAdapter.getNodeStatus.mockRejectedValue('string error');

        const result = await tools.handleToolCall('node_get_status', {});

        expect(result.isError).toBeUndefined();
        const content = JSON.parse((result.content[0] as any).text);
        expect(content.error).toBe('Unknown error');
      });
    });
  });
});
