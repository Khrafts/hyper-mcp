import { z } from 'zod';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('TOOL_REGISTRY');

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: any;
  category: string;
  handler: (params: unknown) => Promise<unknown>;
  schema?: z.ZodSchema;
  version: string;
  enabled: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface IToolRegistry {
  register(category: string, tool: MCPTool): void;
  unregister(toolId: string): void;
  getTools(category?: string): MCPTool[];
  getTool(toolId: string): MCPTool | undefined;
  validateTool(tool: MCPTool): ValidationResult;
  listCategories(): string[];
  getToolsByCategory(category: string): MCPTool[];
  enableTool(toolId: string): void;
  disableTool(toolId: string): void;
  getStatistics(): {
    totalTools: number;
    enabledTools: number;
    disabledTools: number;
    categories: number;
    toolsByCategory: Record<string, number>;
  };
  getHealthStatus(): { healthy: boolean; details: Record<string, unknown> };
}

export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, MCPTool>();
  private categorizedTools = new Map<string, Set<string>>();

  constructor() {
    logger.info('ToolRegistry initialized');
  }

  register(category: string, tool: MCPTool): void {
    // Validate tool before registration
    const validation = this.validateTool(tool);
    if (!validation.valid) {
      logger.error('Tool registration failed', {
        tool_name: tool.name,
        category,
        errors: validation.errors,
      });
      throw new Error(`Tool validation failed: ${validation.errors.join(', ')}`);
    }

    // Check for duplicate tool names
    if (this.tools.has(tool.name)) {
      logger.warn('Tool already exists, overwriting', {
        tool_name: tool.name,
        category,
      });
    }

    // Set tool properties
    tool.category = category;
    tool.enabled = tool.enabled !== false; // Default to enabled

    // Register the tool
    this.tools.set(tool.name, tool);

    // Add to category index
    if (!this.categorizedTools.has(category)) {
      this.categorizedTools.set(category, new Set());
    }
    this.categorizedTools.get(category)!.add(tool.name);

    logger.info('Tool registered successfully', {
      tool_name: tool.name,
      category,
      version: tool.version,
      total_tools: this.tools.size,
    });
  }

  unregister(toolId: string): void {
    const tool = this.tools.get(toolId);
    if (!tool) {
      logger.warn('Attempted to unregister non-existent tool', {
        tool_id: toolId,
      });
      return;
    }

    // Remove from category index
    const categoryTools = this.categorizedTools.get(tool.category);
    if (categoryTools) {
      categoryTools.delete(toolId);
      if (categoryTools.size === 0) {
        this.categorizedTools.delete(tool.category);
      }
    }

    // Remove tool
    this.tools.delete(toolId);

    logger.info('Tool unregistered', {
      tool_name: toolId,
      category: tool.category,
      remaining_tools: this.tools.size,
    });
  }

  getTools(category?: string): MCPTool[] {
    if (category) {
      return this.getToolsByCategory(category);
    }

    const allTools = Array.from(this.tools.values()).filter((tool) => tool.enabled);

    logger.debug('Tools retrieved', {
      category: category || 'all',
      count: allTools.length,
    });

    return allTools;
  }

  getTool(toolId: string): MCPTool | undefined {
    const tool = this.tools.get(toolId);

    if (tool) {
      logger.debug('Tool retrieved', {
        tool_name: toolId,
        category: tool.category,
        enabled: tool.enabled,
      });
    } else {
      logger.debug('Tool not found', { tool_id: toolId });
    }

    return tool?.enabled ? tool : undefined;
  }

  validateTool(tool: MCPTool): ValidationResult {
    const errors: string[] = [];

    // Check required fields
    if (!tool.name || typeof tool.name !== 'string') {
      errors.push('Tool name is required and must be a string');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      errors.push('Tool description is required and must be a string');
    }

    if (!tool.handler || typeof tool.handler !== 'function') {
      errors.push('Tool handler is required and must be a function');
    }

    if (!tool.version || typeof tool.version !== 'string') {
      errors.push('Tool version is required and must be a string');
    }

    // Validate tool name format (alphanumeric, underscores, hyphens)
    if (tool.name && !/^[a-zA-Z0-9_-]+$/.test(tool.name)) {
      errors.push('Tool name must contain only alphanumeric characters, underscores, and hyphens');
    }

    // Validate input schema if provided
    if (tool.inputSchema) {
      try {
        // Basic validation that inputSchema is a valid object
        if (typeof tool.inputSchema !== 'object' || tool.inputSchema === null) {
          errors.push('Input schema must be a valid object');
        }
      } catch (error) {
        errors.push(
          `Invalid input schema: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Validate Zod schema if provided
    if (tool.schema) {
      try {
        // Test parsing with empty object to validate schema structure
        tool.schema.parse({});
      } catch (error) {
        // This is expected for required fields, we just want to check if schema is valid
        if (error instanceof z.ZodError) {
          // Schema is valid if it produces a ZodError (means it's properly structured)
        } else {
          errors.push(
            `Invalid Zod schema: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      logger.debug('Tool validation failed', {
        tool_name: tool.name || 'unknown',
        errors,
      });
    }

    return { valid: isValid, errors };
  }

  listCategories(): string[] {
    const categories = Array.from(this.categorizedTools.keys());

    logger.debug('Categories listed', {
      categories,
      count: categories.length,
    });

    return categories;
  }

  getToolsByCategory(category: string): MCPTool[] {
    const toolIds = this.categorizedTools.get(category);
    if (!toolIds) {
      logger.debug('No tools found for category', { category });
      return [];
    }

    const tools = Array.from(toolIds)
      .map((toolId) => this.tools.get(toolId))
      .filter((tool): tool is MCPTool => tool !== undefined && tool.enabled);

    logger.debug('Tools retrieved by category', {
      category,
      count: tools.length,
    });

    return tools;
  }

  enableTool(toolId: string): void {
    const tool = this.tools.get(toolId);
    if (!tool) {
      logger.warn('Attempted to enable non-existent tool', { tool_id: toolId });
      return;
    }

    tool.enabled = true;
    logger.info('Tool enabled', {
      tool_name: toolId,
      category: tool.category,
    });
  }

  disableTool(toolId: string): void {
    const tool = this.tools.get(toolId);
    if (!tool) {
      logger.warn('Attempted to disable non-existent tool', { tool_id: toolId });
      return;
    }

    tool.enabled = false;
    logger.info('Tool disabled', {
      tool_name: toolId,
      category: tool.category,
    });
  }

  // Bulk operations
  enableCategory(category: string): void {
    const toolIds = this.categorizedTools.get(category);
    if (!toolIds) {
      logger.warn('Category not found for enabling', { category });
      return;
    }

    let enabledCount = 0;
    for (const toolId of toolIds) {
      const tool = this.tools.get(toolId);
      if (tool && !tool.enabled) {
        tool.enabled = true;
        enabledCount++;
      }
    }

    logger.info('Category enabled', {
      category,
      tools_enabled: enabledCount,
    });
  }

  disableCategory(category: string): void {
    const toolIds = this.categorizedTools.get(category);
    if (!toolIds) {
      logger.warn('Category not found for disabling', { category });
      return;
    }

    let disabledCount = 0;
    for (const toolId of toolIds) {
      const tool = this.tools.get(toolId);
      if (tool && tool.enabled) {
        tool.enabled = false;
        disabledCount++;
      }
    }

    logger.info('Category disabled', {
      category,
      tools_disabled: disabledCount,
    });
  }

  // Registry statistics
  getStatistics(): {
    totalTools: number;
    enabledTools: number;
    disabledTools: number;
    categories: number;
    toolsByCategory: Record<string, number>;
  } {
    const totalTools = this.tools.size;
    const enabledTools = Array.from(this.tools.values()).filter((tool) => tool.enabled).length;
    const disabledTools = totalTools - enabledTools;
    const categories = this.categorizedTools.size;

    const toolsByCategory: Record<string, number> = {};
    for (const [category, toolIds] of this.categorizedTools.entries()) {
      toolsByCategory[category] = toolIds.size;
    }

    return {
      totalTools,
      enabledTools,
      disabledTools,
      categories,
      toolsByCategory,
    };
  }

  // Health check
  getHealthStatus(): { healthy: boolean; details: Record<string, unknown> } {
    const stats = this.getStatistics();
    const healthy = stats.totalTools > 0 && stats.enabledTools > 0;

    return {
      healthy,
      details: {
        ...stats,
        registrySize: this.tools.size,
      },
    };
  }

  // Clear all tools (for testing)
  clear(): void {
    const toolCount = this.tools.size;
    this.tools.clear();
    this.categorizedTools.clear();

    logger.info('Tool registry cleared', {
      tools_removed: toolCount,
    });
  }
}
