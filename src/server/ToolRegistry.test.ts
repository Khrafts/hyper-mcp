import { ToolRegistry, MCPTool } from './ToolRegistry.js';
import { z } from 'zod';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  const createTestTool = (name: string, category: string = 'test'): MCPTool => ({
    name,
    description: `Test tool ${name}`,
    category,
    version: '1.0.0',
    enabled: true,
    handler: async (params) => ({ result: params }),
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  });

  describe('register', () => {
    it('should register a valid tool', () => {
      const tool = createTestTool('test-tool');
      
      expect(() => {
        registry.register('test', tool);
      }).not.toThrow();

      const retrieved = registry.getTool('test-tool');
      expect(retrieved).toBeDefined();
      if (retrieved) {
        expect(retrieved.name).toBe('test-tool');
      }
    });

    it('should validate tool before registration', () => {
      const invalidTool = {
        // Missing required fields
        name: '',
        description: '',
      } as MCPTool;

      expect(() => {
        registry.register('test', invalidTool);
      }).toThrow('Tool validation failed');
    });

    it('should allow overwriting existing tool', () => {
      const tool1 = createTestTool('same-name');
      const tool2 = createTestTool('same-name');
      tool2.description = 'Updated description';

      registry.register('test', tool1);
      registry.register('test', tool2);

      const retrieved = registry.getTool('same-name');
      expect(retrieved).toBeDefined();
      if (retrieved) {
        expect(retrieved.description).toBe('Updated description');
      }
    });

    it('should add tool to category index', () => {
      const tool = createTestTool('test-tool');
      registry.register('test-category', tool);

      const categoryTools = registry.getToolsByCategory('test-category');
      expect(categoryTools).toHaveLength(1);
      expect(categoryTools[0]?.name).toBe('test-tool');
    });
  });

  describe('unregister', () => {
    it('should remove registered tool', () => {
      const tool = createTestTool('test-tool');
      registry.register('test', tool);

      registry.unregister('test-tool');

      const retrieved = registry.getTool('test-tool');
      expect(retrieved).toBeUndefined();
    });

    it('should remove tool from category index', () => {
      const tool = createTestTool('test-tool');
      registry.register('test-category', tool);

      registry.unregister('test-tool');

      const categoryTools = registry.getToolsByCategory('test-category');
      expect(categoryTools).toHaveLength(0);
    });

    it('should handle non-existent tool gracefully', () => {
      expect(() => {
        registry.unregister('non-existent');
      }).not.toThrow();
    });
  });

  describe('getTools', () => {
    it('should return all enabled tools', () => {
      const tool1 = createTestTool('tool1');
      const tool2 = createTestTool('tool2');
      const tool3 = createTestTool('tool3');
      tool3.enabled = false;

      registry.register('test', tool1);
      registry.register('test', tool2);
      registry.register('test', tool3);

      const tools = registry.getTools();
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toContain('tool1');
      expect(tools.map(t => t.name)).toContain('tool2');
      expect(tools.map(t => t.name)).not.toContain('tool3');
    });

    it('should return tools for specific category', () => {
      const tool1 = createTestTool('tool1', 'category1');
      const tool2 = createTestTool('tool2', 'category2');

      registry.register('category1', tool1);
      registry.register('category2', tool2);

      const category1Tools = registry.getTools('category1');
      expect(category1Tools).toHaveLength(1);
      expect(category1Tools[0]?.name).toBe('tool1');
    });
  });

  describe('getTool', () => {
    it('should return specific tool if enabled', () => {
      const tool = createTestTool('test-tool');
      registry.register('test', tool);

      const retrieved = registry.getTool('test-tool');
      expect(retrieved).toBeDefined();
      if (retrieved) {
        expect(retrieved.name).toBe('test-tool');
      }
    });

    it('should return undefined for disabled tool', () => {
      const tool = createTestTool('test-tool');
      tool.enabled = false;
      registry.register('test', tool);

      const retrieved = registry.getTool('test-tool');
      expect(retrieved).toBeUndefined();
    });

    it('should return undefined for non-existent tool', () => {
      const retrieved = registry.getTool('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('validateTool', () => {
    it('should validate correct tool', () => {
      const tool = createTestTool('valid-tool');
      const result = registry.validateTool(tool);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing name', () => {
      const tool = createTestTool('');
      const result = registry.validateTool(tool);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('name is required')
      );
    });

    it('should fail validation for missing description', () => {
      const tool = createTestTool('test');
      tool.description = '';
      const result = registry.validateTool(tool);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('description is required')
      );
    });

    it('should fail validation for missing handler', () => {
      const tool = createTestTool('test');
      delete (tool as any).handler;
      const result = registry.validateTool(tool);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('handler is required')
      );
    });

    it('should fail validation for invalid name format', () => {
      const tool = createTestTool('invalid name with spaces!');
      const result = registry.validateTool(tool);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('name must contain only alphanumeric')
      );
    });

    it('should validate tool with Zod schema', () => {
      const tool = createTestTool('test');
      tool.schema = z.object({
        message: z.string(),
      });

      const result = registry.validateTool(tool);
      expect(result.valid).toBe(true);
    });
  });

  describe('enableTool and disableTool', () => {
    it('should enable and disable tools', () => {
      const tool = createTestTool('test-tool');
      registry.register('test', tool);

      registry.disableTool('test-tool');
      expect(registry.getTool('test-tool')).toBeUndefined();

      registry.enableTool('test-tool');
      expect(registry.getTool('test-tool')).toBeDefined();
    });

    it('should handle non-existent tools gracefully', () => {
      expect(() => {
        registry.enableTool('non-existent');
        registry.disableTool('non-existent');
      }).not.toThrow();
    });
  });

  describe('category operations', () => {
    beforeEach(() => {
      const tool1 = createTestTool('tool1', 'category1');
      const tool2 = createTestTool('tool2', 'category1');
      const tool3 = createTestTool('tool3', 'category2');

      registry.register('category1', tool1);
      registry.register('category1', tool2);
      registry.register('category2', tool3);
    });

    it('should list categories', () => {
      const categories = registry.listCategories();
      expect(categories).toContain('category1');
      expect(categories).toContain('category2');
    });

    it('should get tools by category', () => {
      const category1Tools = registry.getToolsByCategory('category1');
      expect(category1Tools).toHaveLength(2);
      expect(category1Tools.map(t => t.name)).toContain('tool1');
      expect(category1Tools.map(t => t.name)).toContain('tool2');
    });

    it('should enable/disable entire category', () => {
      registry.disableCategory('category1');
      
      const category1Tools = registry.getToolsByCategory('category1');
      expect(category1Tools).toHaveLength(0);

      registry.enableCategory('category1');
      
      const enabledTools = registry.getToolsByCategory('category1');
      expect(enabledTools).toHaveLength(2);
    });
  });

  describe('statistics and health', () => {
    it('should return statistics', () => {
      const tool1 = createTestTool('tool1', 'category1');
      const tool2 = createTestTool('tool2', 'category1');
      tool2.enabled = false;

      registry.register('category1', tool1);
      registry.register('category1', tool2);

      const stats = registry.getStatistics();
      expect(stats.totalTools).toBe(2);
      expect(stats.enabledTools).toBe(1);
      expect(stats.disabledTools).toBe(1);
      expect(stats.categories).toBe(1);
      expect(stats.toolsByCategory.category1).toBe(2);
    });

    it('should return health status', () => {
      const tool = createTestTool('tool1');
      registry.register('test', tool);

      const health = registry.getHealthStatus();
      expect(health.healthy).toBe(true);
      expect(health.details.totalTools).toBe(1);
    });

    it('should report unhealthy with no tools', () => {
      const health = registry.getHealthStatus();
      expect(health.healthy).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all tools and categories', () => {
      const tool1 = createTestTool('tool1');
      const tool2 = createTestTool('tool2');

      registry.register('test', tool1);
      registry.register('test', tool2);

      registry.clear();

      expect(registry.getTools()).toHaveLength(0);
      expect(registry.listCategories()).toHaveLength(0);
    });
  });
});