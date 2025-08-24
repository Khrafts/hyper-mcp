import { CommunityManager } from '../../src/community/CommunityManager.js';
import { CommunityProtocol, CommunitySystemConfig, LoadedProtocol, GitHubSubmission } from '../../src/community/types/index.js';

// Mock the dependencies
const mockValidate = jest.fn();
const mockLoad = jest.fn();
const mockUnload = jest.fn();
const mockShutdown = jest.fn();
const mockOn = jest.fn();
const mockEmit = jest.fn();
const mockGetSubmissionHistory = jest.fn();

jest.mock('../../src/community/validation/ProtocolValidator.js', () => ({
  ProtocolValidator: jest.fn().mockImplementation((config) => {
    if (!config) {
      throw new Error('ProtocolValidator config is required');
    }
    return {
      validate: mockValidate
    };
  })
}));

jest.mock('../../src/community/loading/DynamicLoader.js', () => ({
  DynamicLoader: jest.fn().mockImplementation(() => ({
    load: mockLoad,
    unload: mockUnload,
    shutdown: mockShutdown,
    on: mockOn,
    emit: mockEmit
  }))
}));

jest.mock('../../src/community/github/GitHubIntegration.js', () => ({
  GitHubIntegration: jest.fn().mockImplementation(() => ({
    getSubmissionHistory: mockGetSubmissionHistory,
    updateSubmissionStatus: jest.fn(),
    approveSubmission: jest.fn(),
    rejectSubmission: jest.fn(),
    getProtocolFromSubmission: jest.fn(),
    shutdown: mockShutdown,
    on: mockOn,
    emit: mockEmit
  }))
}));

const mockValidationResult = {
  valid: true,
  errors: [],
  warnings: []
};

const mockLoadedProtocol: LoadedProtocol = {
  protocol: {
    name: 'test-protocol',
    version: '1.0.0',
    description: 'A test protocol',
    author: 'Test Author',
    license: 'MIT',
    endpoints: [
      {
        name: 'getData',
        method: 'GET',
        path: '/api/data',
        description: 'Get data',
        response: { type: 'object', description: 'Response' }
      },
      {
        name: 'postData',
        method: 'POST',
        path: '/api/data',
        description: 'Post data',
        response: { type: 'object', description: 'Response' }
      }
    ]
  },
  tools: [
    {
      name: 'test_getData',
      description: 'Get data from test protocol',
      parameters: {
        type: 'object',
        properties: {}
      },
      handler: jest.fn(),
      metadata: {
        protocol: 'test-protocol',
        version: '1.0.0',
        endpoint: 'getData'
      }
    },
    {
      name: 'test_postData',
      description: 'Post data to test protocol',
      parameters: {
        type: 'object',
        properties: {}
      },
      handler: jest.fn(),
      metadata: {
        protocol: 'test-protocol',
        version: '1.0.0',
        endpoint: 'postData'
      }
    }
  ],
  status: 'loaded',
  loadedAt: new Date()
};

describe('CommunityManager', () => {
  let communityManager: CommunityManager;
  let config: CommunitySystemConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up default mock behaviors
    mockValidate.mockResolvedValue(mockValidationResult);
    mockLoad.mockResolvedValue(mockLoadedProtocol);
    mockUnload.mockResolvedValue(undefined);
    mockShutdown.mockResolvedValue(undefined);
    mockGetSubmissionHistory.mockResolvedValue([]);
    
    config = {
      validation: {
        strictMode: true,
        maxEndpoints: 10,
        requiredFields: ['name', 'version', 'description', 'author', 'license']
      },
      loading: {
        timeout: 10000,
        retries: 2,
        cacheTTL: 3600000
      },
      github: {
        repository: 'test/repo',
        autoMerge: false
      }
    };

    communityManager = new CommunityManager(config);
  });

  afterEach(async () => {
    await communityManager.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize with provided configuration', () => {
      expect(communityManager).toBeInstanceOf(CommunityManager);
    });

    it('should set up event listeners', () => {
      // Check that the component listeners were set up
      expect(mockOn).toHaveBeenCalledWith('protocol:loaded', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('protocol:error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('submission:received', expect.any(Function));
    });
  });

  describe('Protocol Validation', () => {
    const sampleProtocol: CommunityProtocol = {
      name: 'test-protocol',
      version: '1.0.0',
      description: 'A test protocol for validation',
      author: 'Test Author',
      license: 'MIT',
      endpoints: [
        {
          name: 'getData',
          method: 'GET',
          path: '/api/data',
          description: 'Get data',
          response: { type: 'object', description: 'Response' }
        }
      ]
    };

    it('should validate protocols successfully', async () => {
      const result = await communityManager.validateProtocol(sampleProtocol);

      expect(result).toEqual(mockValidationResult);
      expect(mockValidate).toHaveBeenCalledWith(sampleProtocol);
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed');
      mockValidate.mockRejectedValue(validationError);

      await expect(communityManager.validateProtocol(sampleProtocol)).rejects.toThrow('Validation failed');
    });
  });

  describe('Protocol Loading', () => {
    const sampleProtocol: CommunityProtocol = {
      name: 'test-protocol',
      version: '1.0.0',
      description: 'A test protocol',
      author: 'Test Author',
      license: 'MIT',
      endpoints: []
    };

    beforeEach(() => {
      // Mock successful validation
      const mockValidator = require('../../src/community/validation/ProtocolValidator').ProtocolValidator;
      mockValidator.prototype.validate = jest.fn().mockResolvedValue(mockValidationResult);

      // Mock successful loading
      const mockLoader = require('../../src/community/loading/DynamicLoader').DynamicLoader;
      mockLoader.prototype.load = jest.fn().mockResolvedValue(mockLoadedProtocol);
      mockLoader.prototype.unload = jest.fn().mockResolvedValue(undefined);
    });

    it('should load protocols successfully', async () => {
      const result = await communityManager.loadProtocol(sampleProtocol);

      expect(result).toEqual(mockLoadedProtocol);
      expect(communityManager.isProtocolLoaded('test-protocol')).toBe(true);
    });

    it('should reject loading invalid protocols', async () => {
      // Mock validation failure
      const validationResult = {
        valid: false,
        errors: [{ code: 'INVALID_PROTOCOL', message: 'Protocol is invalid', path: '', severity: 'error' }],
        warnings: []
      };
      mockValidate.mockResolvedValue(validationResult);

      await expect(communityManager.loadProtocol(sampleProtocol)).rejects.toThrow('Protocol validation failed');
    });

    it('should unload protocols successfully', async () => {
      await communityManager.loadProtocol(sampleProtocol);
      expect(communityManager.isProtocolLoaded('test-protocol')).toBe(true);

      await communityManager.unloadProtocol('test-protocol');
      expect(communityManager.isProtocolLoaded('test-protocol')).toBe(false);
    });

    it('should handle unloading non-existent protocols', async () => {
      await expect(communityManager.unloadProtocol('non-existent')).rejects.toThrow('Protocol not found: non-existent');
    });

    it('should reload protocols successfully', async () => {
      await communityManager.loadProtocol(sampleProtocol);
      
      const result = await communityManager.reloadProtocol('test-protocol');
      
      expect(result).toEqual(mockLoadedProtocol);
    });

    it('should handle reloading non-existent protocols', async () => {
      await expect(communityManager.reloadProtocol('non-existent')).rejects.toThrow('Protocol not found: non-existent');
    });
  });

  describe('Protocol Management', () => {
    beforeEach(async () => {
      // Setup mocks for successful operations
      const mockValidator = require('../../src/community/validation/ProtocolValidator').ProtocolValidator;
      mockValidator.prototype.validate = jest.fn().mockResolvedValue(mockValidationResult);

      const mockLoader = require('../../src/community/loading/DynamicLoader').DynamicLoader;
      mockLoader.prototype.load = jest.fn().mockResolvedValue(mockLoadedProtocol);
      mockLoader.prototype.unload = jest.fn().mockResolvedValue(undefined);

      // Load a test protocol
      await communityManager.loadProtocol(mockLoadedProtocol.protocol);
    });

    it('should get loaded protocols', () => {
      const protocols = communityManager.getLoadedProtocols();
      
      expect(protocols).toHaveLength(1);
      expect(protocols[0]).toEqual(mockLoadedProtocol);
    });

    it('should get specific protocol', () => {
      const protocol = communityManager.getProtocol('test-protocol');
      
      expect(protocol).toEqual(mockLoadedProtocol);
    });

    it('should return undefined for non-existent protocol', () => {
      const protocol = communityManager.getProtocol('non-existent');
      
      expect(protocol).toBeUndefined();
    });

    it('should check if protocol is loaded', () => {
      expect(communityManager.isProtocolLoaded('test-protocol')).toBe(true);
      expect(communityManager.isProtocolLoaded('non-existent')).toBe(false);
    });
  });

  describe('GitHub Submission Handling', () => {
    const mockSubmission: GitHubSubmission = {
      pullRequestNumber: 123,
      author: 'test-author',
      protocolPath: 'protocols/test-protocol.json',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      // Mock GitHub submission history
      mockGetSubmissionHistory.mockResolvedValue([mockSubmission]);
      
      // Mock GitHub integration methods for submission handling
      const mockGetProtocolFromSubmission = jest.fn().mockResolvedValue(mockLoadedProtocol.protocol);
      const mockUpdateSubmissionStatus = jest.fn().mockResolvedValue(undefined);
      const mockApproveSubmission = jest.fn().mockResolvedValue(undefined);
      const mockRejectSubmission = jest.fn().mockResolvedValue(undefined);
      
      // Add these to the GitHub mock
      require('../../src/community/github/GitHubIntegration.js').GitHubIntegration.mockImplementation(() => ({
        getSubmissionHistory: mockGetSubmissionHistory,
        updateSubmissionStatus: mockUpdateSubmissionStatus,
        approveSubmission: mockApproveSubmission,
        rejectSubmission: mockRejectSubmission,
        getProtocolFromSubmission: mockGetProtocolFromSubmission,
        shutdown: mockShutdown,
        on: mockOn,
        emit: mockEmit
      }));
    });

    it('should get submission history', async () => {
      const history = await communityManager.getSubmissionHistory();
      
      expect(history).toEqual([mockSubmission]);
    });

    it('should handle valid submissions', (done) => {
      communityManager.on('submission:processed', (submission: any) => {
        expect(submission.status).toBe('validated');
        done();
      });

      // Trigger the GitHub submission callback
      const submissionReceivedCallback = mockOn.mock.calls.find(call => call[0] === 'submission:received')?.[1];
      if (submissionReceivedCallback) {
        submissionReceivedCallback(mockSubmission);
      } else {
        done.fail('submission:received callback not found');
      }
    });

    it('should handle invalid submissions', (done) => {
      // Mock validation failure
      const validationResult = {
        valid: false,
        errors: [{ code: 'INVALID_PROTOCOL', message: 'Protocol is invalid', path: '', severity: 'error' }],
        warnings: []
      };
      mockValidate.mockResolvedValue(validationResult);

      communityManager.on('submission:processed', (submission: any) => {
        expect(submission.status).toBe('rejected');
        done();
      });

      // Trigger the GitHub submission callback
      const submissionReceivedCallback = mockOn.mock.calls.find(call => call[0] === 'submission:received')?.[1];
      if (submissionReceivedCallback) {
        submissionReceivedCallback(mockSubmission);
      } else {
        done.fail('submission:received callback not found');
      }
    });

    it('should auto-approve valid submissions when configured', (done) => {
      // Enable auto-merge
      const autoMergeConfig = {
        ...config,
        github: { ...config.github, autoMerge: true }
      };
      
      // Create a new manager with auto-merge enabled
      const autoApproveCommunityManager = new CommunityManager(autoMergeConfig);

      autoApproveCommunityManager.on('submission:processed', (submission: any) => {
        expect(submission.status).toBe('approved');
        autoApproveCommunityManager.shutdown();
        done();
      });

      // Find the callback from the new manager's mock calls
      // Since we created a new manager, we need to trigger its callback
      const allCallsAfterNewManager = mockOn.mock.calls.slice(-3); // Get the last 3 calls
      const submissionCallback = allCallsAfterNewManager.find(call => call[0] === 'submission:received')?.[1];
      
      if (submissionCallback) {
        submissionCallback(mockSubmission);
      } else {
        done.fail('submission:received callback not found');
      }
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      // Setup mocks for successful operations
      const mockValidator = require('../../src/community/validation/ProtocolValidator').ProtocolValidator;
      mockValidator.prototype.validate = jest.fn().mockResolvedValue(mockValidationResult);

      const mockLoader = require('../../src/community/loading/DynamicLoader').DynamicLoader;
      const loadedProtocolWithTools = {
        ...mockLoadedProtocol,
        tools: [
          { name: 'tool1', description: 'Tool 1', parameters: {}, handler: jest.fn(), metadata: {} },
          { name: 'tool2', description: 'Tool 2', parameters: {}, handler: jest.fn(), metadata: {} }
        ]
      };
      mockLoader.prototype.load = jest.fn().mockResolvedValue(loadedProtocolWithTools);
      mockLoader.prototype.unload = jest.fn().mockResolvedValue(undefined);

      // Load a test protocol
      await communityManager.loadProtocol(mockLoadedProtocol.protocol);
    });

    it('should provide accurate statistics', () => {
      const stats = communityManager.getStats();

      expect(stats).toEqual({
        loadedProtocols: 1, // One protocol loaded in beforeEach
        totalTools: 2, // The loaded protocol has 2 tools
        successfulSubmissions: 0, // TODO items in implementation
        failedSubmissions: 0
      });
    });
  });

  describe('Event Handling', () => {
    it('should emit protocol:loaded events', (done) => {
      communityManager.on('protocol:loaded', (protocol: any) => {
        expect(protocol).toEqual(mockLoadedProtocol);
        done();
      });

      // Trigger the event by simulating the loader callback
      // Get the callback that was registered with mockOn
      const protocolLoadedCallback = mockOn.mock.calls.find(call => call[0] === 'protocol:loaded')?.[1];
      if (protocolLoadedCallback) {
        protocolLoadedCallback(mockLoadedProtocol);
      } else {
        done.fail('protocol:loaded callback not found');
      }
    });

    it('should emit protocol:error events', (done) => {
      const error = new Error('Loading failed');

      communityManager.on('protocol:error', (name: string, err: Error) => {
        expect(name).toBe('test-protocol');
        expect(err).toBe(error);
        done();
      });

      // Trigger the event by simulating the loader callback
      const protocolErrorCallback = mockOn.mock.calls.find(call => call[0] === 'protocol:error')?.[1];
      if (protocolErrorCallback) {
        protocolErrorCallback('test-protocol', error);
      } else {
        done.fail('protocol:error callback not found');
      }
    });
  });

  describe('Shutdown', () => {
    beforeEach(async () => {
      // Load some protocols first
      const mockValidator = require('../../src/community/validation/ProtocolValidator').ProtocolValidator;
      mockValidator.prototype.validate = jest.fn().mockResolvedValue(mockValidationResult);

      const mockLoader = require('../../src/community/loading/DynamicLoader').DynamicLoader;
      mockLoader.prototype.load = jest.fn().mockResolvedValue(mockLoadedProtocol);
      mockLoader.prototype.unload = jest.fn().mockResolvedValue(undefined);
      mockLoader.prototype.shutdown = jest.fn().mockResolvedValue(undefined);

      const mockGitHub = require('../../src/community/github/GitHubIntegration').GitHubIntegration;
      mockGitHub.prototype.shutdown = jest.fn().mockResolvedValue(undefined);

      await communityManager.loadProtocol(mockLoadedProtocol.protocol);
    });

    it('should shutdown gracefully', async () => {
      await expect(communityManager.shutdown()).resolves.not.toThrow();
      
      // Should have no loaded protocols after shutdown
      expect(communityManager.getLoadedProtocols()).toHaveLength(0);
    });

    it('should remove all event listeners on shutdown', async () => {
      await communityManager.shutdown();
      
      expect(communityManager.listenerCount('protocol:loaded')).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle component initialization errors gracefully', () => {
      const invalidConfig = {
        ...config,
        validation: null as any
      };

      expect(() => new CommunityManager(invalidConfig)).toThrow();
    });

    it('should handle protocol loading errors', async () => {
      mockLoad.mockRejectedValue(new Error('Loading failed'));

      const sampleProtocol: CommunityProtocol = {
        name: 'test-protocol',
        version: '1.0.0',
        description: 'A test protocol',
        author: 'Test Author',
        license: 'MIT',
        endpoints: []
      };

      await expect(communityManager.loadProtocol(sampleProtocol)).rejects.toThrow('Loading failed');
    });

    it('should handle submission processing errors', (done) => {
      // Create a new community manager with a failing GitHub mock
      const failingMockGetProtocol = jest.fn().mockRejectedValue(new Error('GitHub error'));
      const failingMockRejectSubmission = jest.fn().mockResolvedValue(undefined);
      
      // Override the GitHub mock for this test
      require('../../src/community/github/GitHubIntegration.js').GitHubIntegration.mockImplementation(() => ({
        getSubmissionHistory: mockGetSubmissionHistory,
        updateSubmissionStatus: jest.fn(),
        approveSubmission: jest.fn(),
        rejectSubmission: failingMockRejectSubmission,
        getProtocolFromSubmission: failingMockGetProtocol,
        shutdown: mockShutdown,
        on: mockOn,
        emit: mockEmit
      }));

      // Create a new community manager to use the new mock
      const testCommunityManager = new CommunityManager(config);

      const mockSubmission: GitHubSubmission = {
        pullRequestNumber: 123,
        author: 'test-author',
        protocolPath: 'protocols/test-protocol.json',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      testCommunityManager.on('submission:processed', (submission: any) => {
        expect(submission.status).toBe('rejected');
        testCommunityManager.shutdown();
        done();
      });

      // Get the callback from the new manager
      const newManagerCallbacks = mockOn.mock.calls.slice(-3); // Get last 3 calls for new manager
      const submissionReceivedCallback = newManagerCallbacks.find(call => call[0] === 'submission:received')?.[1];
      
      if (submissionReceivedCallback) {
        submissionReceivedCallback(mockSubmission);
      } else {
        done.fail('submission:received callback not found');
      }
    });
  });
});