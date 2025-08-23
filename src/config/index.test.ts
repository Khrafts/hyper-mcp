import { getConfig, validateConfig } from './index.js';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateConfig', () => {
    it('should validate default configuration', () => {
      const result = validateConfig();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate with custom environment variables', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'warn';
      process.env.MCP_SERVER_PORT = '8080';

      const result = validateConfig();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with invalid LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'invalid';

      const result = validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('LOG_LEVEL')
      );
    });

    it('should fail validation with invalid port number', () => {
      process.env.MCP_SERVER_PORT = 'not-a-number';

      const result = validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('MCP_SERVER_PORT')
      );
    });
  });

  describe('getConfig', () => {
    it('should return configuration with defaults', () => {
      const config = getConfig();

      expect(config.NODE_ENV).toBe('development');
      expect(config.LOG_LEVEL).toBe('info');
      expect(config.MCP_SERVER_PORT).toBe(3000);
      expect(config.HYPERLIQUID_API_BASE_URL).toBe('https://api.hyperliquid.xyz');
    });

    it('should return configuration with custom values', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'error';
      process.env.MCP_SERVER_PORT = '9000';
      process.env.HYPERLIQUID_API_KEY = 'test-key';

      // Clear cached config
      jest.resetModules();

      const config = getConfig();

      expect(config.NODE_ENV).toBe('production');
      expect(config.LOG_LEVEL).toBe('error');
      expect(config.MCP_SERVER_PORT).toBe(9000);
      expect(config.HYPERLIQUID_API_KEY).toBe('test-key');
    });

    it('should throw error for invalid configuration', () => {
      process.env.NODE_ENV = 'invalid';

      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should cache configuration', () => {
      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2); // Same object reference
    });
  });
});