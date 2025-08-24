import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../utils/logger.js';
import { ToolGenerator } from '../generation/ToolGenerator.js';
import { ProtocolValidator } from '../validation/ProtocolValidator.js';
import { CommunityProtocol, LoadedProtocol, GeneratedTool } from '../types/index.js';

export interface LoadingConfig {
  timeout: number;
  retries: number;
  cacheTTL: number;
  maxConcurrentLoads?: number;
  allowRemoteLoading?: boolean;
  trustedSources?: string[];
}

export interface ProtocolCache {
  protocol: LoadedProtocol;
  cachedAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

export class DynamicLoader extends EventEmitter {
  private toolGenerator: ToolGenerator;
  private validator: ProtocolValidator;
  private config: LoadingConfig;
  private cache: Map<string, ProtocolCache> = new Map();
  private loadingQueue: Map<string, Promise<LoadedProtocol>> = new Map();
  private loadedProtocols: Map<string, LoadedProtocol> = new Map();

  constructor(config: LoadingConfig) {
    super();
    this.config = {
      maxConcurrentLoads: 5,
      allowRemoteLoading: false,
      trustedSources: [],
      ...config,
    };

    this.toolGenerator = new ToolGenerator({
      timeout: config.timeout,
      retries: config.retries,
    });

    this.validator = new ProtocolValidator({
      strictMode: true,
      maxEndpoints: 50,
      requiredFields: ['name', 'version', 'description', 'author', 'license'],
    });

    this.setupEventListeners();
    this.startCacheCleanup();

    logger.debug('DynamicLoader initialized', { config });
  }

  private setupEventListeners(): void {
    this.toolGenerator.on('tools:generated', (data) => {
      this.emit('tools:generated', data);
    });

    this.toolGenerator.on('tools:error', (protocol, error) => {
      this.emit('protocol:error', protocol, error);
    });
  }

  async load(protocol: CommunityProtocol): Promise<LoadedProtocol> {
    const protocolKey = `${protocol.name}@${protocol.version}`;

    try {
      logger.info(`Loading protocol: ${protocolKey}`);

      // Check if already loaded
      const existing = this.loadedProtocols.get(protocolKey);
      if (existing && existing.status === 'loaded') {
        logger.debug(`Protocol already loaded: ${protocolKey}`);
        return existing;
      }

      // Check cache
      const cached = this.getCachedProtocol(protocolKey);
      if (cached) {
        logger.debug(`Loading protocol from cache: ${protocolKey}`);
        this.loadedProtocols.set(protocolKey, cached);
        this.updateCacheAccess(protocolKey);
        return cached;
      }

      // Check if currently loading
      const existingLoad = this.loadingQueue.get(protocolKey);
      if (existingLoad) {
        logger.debug(`Protocol already loading, waiting: ${protocolKey}`);
        return existingLoad;
      }

      // Start loading
      const loadPromise = this.performLoad(protocol);
      this.loadingQueue.set(protocolKey, loadPromise);

      try {
        const loadedProtocol = await loadPromise;
        this.loadingQueue.delete(protocolKey);
        this.loadedProtocols.set(protocolKey, loadedProtocol);
        this.cacheProtocol(protocolKey, loadedProtocol);

        this.emit('protocol:loaded', loadedProtocol);
        logger.info(`Successfully loaded protocol: ${protocolKey}`);

        return loadedProtocol;
      } catch (error) {
        this.loadingQueue.delete(protocolKey);
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to load protocol ${protocolKey}:`, error);

      const errorProtocol: LoadedProtocol = {
        protocol,
        tools: [],
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown loading error',
        loadedAt: new Date(),
      };

      this.loadedProtocols.set(protocolKey, errorProtocol);
      this.emit('protocol:error', protocolKey, error);

      throw error;
    }
  }

  private async performLoad(protocol: CommunityProtocol): Promise<LoadedProtocol> {
    const loadedProtocol: LoadedProtocol = {
      protocol,
      tools: [],
      status: 'loading',
      loadedAt: new Date(),
    };

    try {
      // Validate protocol
      logger.debug(`Validating protocol: ${protocol.name}`);
      const validationResult = await this.validator.validate(protocol);
      if (!validationResult.valid) {
        throw new Error(
          `Protocol validation failed: ${validationResult.errors.map((e: any) => e.message).join(', ')}`
        );
      }

      // Generate tools
      logger.debug(`Generating tools for protocol: ${protocol.name}`);
      const tools = await this.toolGenerator.generateTools(protocol);

      // Validate generated tools
      const toolValidation = await this.toolGenerator.validateGeneratedTools(tools);
      if (!toolValidation.valid) {
        throw new Error(`Generated tools validation failed: ${toolValidation.errors.join(', ')}`);
      }

      loadedProtocol.tools = tools;
      loadedProtocol.status = 'loaded';

      logger.debug(`Successfully loaded protocol with ${tools.length} tools: ${protocol.name}`);
      return loadedProtocol;
    } catch (error) {
      loadedProtocol.status = 'error';
      loadedProtocol.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async unload(protocolKey: string): Promise<void> {
    try {
      logger.info(`Unloading protocol: ${protocolKey}`);

      // Remove from loaded protocols
      const loadedProtocol = this.loadedProtocols.get(protocolKey);
      if (loadedProtocol) {
        this.loadedProtocols.delete(protocolKey);

        // Cleanup tool handlers if needed
        await this.cleanupToolHandlers(loadedProtocol.tools);
      }

      // Remove from cache
      this.cache.delete(protocolKey);

      // Cancel loading if in progress
      const loadingPromise = this.loadingQueue.get(protocolKey);
      if (loadingPromise) {
        this.loadingQueue.delete(protocolKey);
      }

      this.emit('protocol:unloaded', protocolKey);
      logger.info(`Successfully unloaded protocol: ${protocolKey}`);
    } catch (error) {
      logger.error(`Failed to unload protocol ${protocolKey}:`, error);
      throw error;
    }
  }

  async reload(protocolKey: string): Promise<LoadedProtocol> {
    const existingProtocol = this.loadedProtocols.get(protocolKey);
    if (!existingProtocol) {
      throw new Error(`Protocol not found: ${protocolKey}`);
    }

    await this.unload(protocolKey);
    return this.load(existingProtocol.protocol);
  }

  async loadFromFile(filePath: string): Promise<LoadedProtocol> {
    try {
      logger.debug(`Loading protocol from file: ${filePath}`);

      const absolutePath = path.resolve(filePath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const protocol: CommunityProtocol = JSON.parse(fileContent);

      return this.load(protocol);
    } catch (error) {
      logger.error(`Failed to load protocol from file ${filePath}:`, error);
      throw new Error(
        `Failed to load protocol from file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async loadFromUrl(url: string): Promise<LoadedProtocol> {
    if (!this.config.allowRemoteLoading) {
      throw new Error('Remote loading is disabled');
    }

    try {
      // Check if source is trusted
      if (this.config.trustedSources && this.config.trustedSources.length > 0) {
        const urlObj = new URL(url);
        const isTrusted = this.config.trustedSources.some(
          (source) => urlObj.hostname === source || urlObj.hostname.endsWith(`.${source}`)
        );

        if (!isTrusted) {
          throw new Error(`Untrusted source: ${urlObj.hostname}`);
        }
      }

      logger.debug(`Loading protocol from URL: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'HyperMCP-DynamicLoader/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const protocol = (await response.json()) as CommunityProtocol;
      return this.load(protocol);
    } catch (error) {
      logger.error(`Failed to load protocol from URL ${url}:`, error);
      throw new Error(
        `Failed to load protocol from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private getCachedProtocol(protocolKey: string): LoadedProtocol | null {
    const cached = this.cache.get(protocolKey);
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (cached.expiresAt <= new Date()) {
      this.cache.delete(protocolKey);
      return null;
    }

    return cached.protocol;
  }

  private cacheProtocol(protocolKey: string, loadedProtocol: LoadedProtocol): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.cacheTTL);

    this.cache.set(protocolKey, {
      protocol: loadedProtocol,
      cachedAt: now,
      expiresAt,
      accessCount: 1,
      lastAccessed: now,
    });

    logger.debug(`Cached protocol: ${protocolKey}`, { expiresAt });
  }

  private updateCacheAccess(protocolKey: string): void {
    const cached = this.cache.get(protocolKey);
    if (cached) {
      cached.accessCount++;
      cached.lastAccessed = new Date();
    }
  }

  private async cleanupToolHandlers(tools: GeneratedTool[]): Promise<void> {
    // Cleanup any resources held by tool handlers
    for (const tool of tools) {
      try {
        // If tool handler has cleanup method, call it
        if (typeof tool.handler === 'object' && 'cleanup' in tool.handler) {
          await (tool.handler as any).cleanup();
        }
      } catch (error) {
        logger.warn(`Failed to cleanup tool handler ${tool.name}:`, error);
      }
    }
  }

  private startCacheCleanup(): void {
    // Run cache cleanup every 5 minutes
    setInterval(
      () => {
        this.cleanupExpiredCache();
      },
      5 * 60 * 1000
    );
  }

  private cleanupExpiredCache(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => {
      this.cache.delete(key);
      logger.debug(`Removed expired cache entry: ${key}`);
    });

    if (expiredKeys.length > 0) {
      logger.info(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  getLoadedProtocols(): LoadedProtocol[] {
    return Array.from(this.loadedProtocols.values());
  }

  getLoadedProtocol(protocolKey: string): LoadedProtocol | undefined {
    return this.loadedProtocols.get(protocolKey);
  }

  isLoaded(protocolKey: string): boolean {
    const protocol = this.loadedProtocols.get(protocolKey);
    return protocol?.status === 'loaded';
  }

  isLoading(protocolKey: string): boolean {
    return this.loadingQueue.has(protocolKey);
  }

  getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
    totalAccess: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const cacheEntries = Array.from(this.cache.values());

    return {
      size: this.cache.size,
      hits: 0, // TODO: Implement hit/miss tracking
      misses: 0,
      totalAccess: cacheEntries.reduce((sum, entry) => sum + entry.accessCount, 0),
      oldestEntry:
        cacheEntries.length > 0
          ? new Date(Math.min(...cacheEntries.map((e) => e.cachedAt.getTime())))
          : undefined,
      newestEntry:
        cacheEntries.length > 0
          ? new Date(Math.max(...cacheEntries.map((e) => e.cachedAt.getTime())))
          : undefined,
    };
  }

  getLoadingStats(): {
    loaded: number;
    loading: number;
    error: number;
    cached: number;
    queueLength: number;
  } {
    const protocols = Array.from(this.loadedProtocols.values());

    return {
      loaded: protocols.filter((p) => p.status === 'loaded').length,
      loading: protocols.filter((p) => p.status === 'loading').length,
      error: protocols.filter((p) => p.status === 'error').length,
      cached: this.cache.size,
      queueLength: this.loadingQueue.size,
    };
  }

  async clearCache(): Promise<void> {
    logger.info(`Clearing protocol cache (${this.cache.size} entries)`);
    this.cache.clear();
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down DynamicLoader...');

    // Cancel all loading operations
    this.loadingQueue.clear();

    // Unload all protocols
    const protocolKeys = Array.from(this.loadedProtocols.keys());
    await Promise.all(
      protocolKeys.map((key) =>
        this.unload(key).catch((err) =>
          logger.warn(`Failed to unload protocol during shutdown: ${key}`, err)
        )
      )
    );

    // Clear cache
    await this.clearCache();

    // Remove all listeners
    this.removeAllListeners();

    logger.info('DynamicLoader shutdown complete');
  }
}
