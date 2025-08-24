import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { ProtocolValidator } from './validation/ProtocolValidator.js';
import { DynamicLoader } from './loading/DynamicLoader.js';
import { GitHubIntegration } from './github/GitHubIntegration.js';
import {
  CommunityProtocol,
  CommunitySystemConfig,
  LoadedProtocol,
  ValidationResult,
  GitHubSubmission
} from './types/index.js';

export class CommunityManager extends EventEmitter {
  private validator: ProtocolValidator;
  private loader: DynamicLoader;
  private github: GitHubIntegration;
  private loadedProtocols: Map<string, LoadedProtocol> = new Map();
  private config: CommunitySystemConfig;

  constructor(config: CommunitySystemConfig) {
    super();
    this.config = config;
    this.validator = new ProtocolValidator(config.validation);
    this.loader = new DynamicLoader(config.loading);
    this.github = new GitHubIntegration(config.github);

    this.setupEventListeners();
    logger.info('CommunityManager initialized');
  }

  private setupEventListeners(): void {
    this.loader.on('protocol:loaded', (protocol: LoadedProtocol) => {
      this.loadedProtocols.set(protocol.protocol.name, protocol);
      this.emit('protocol:loaded', protocol);
      logger.info(`Protocol loaded: ${protocol.protocol.name}@${protocol.protocol.version}`);
    });

    this.loader.on('protocol:error', (name: string, error: Error) => {
      this.emit('protocol:error', name, error);
      logger.error(`Protocol load error: ${name}`, error);
    });

    this.github.on('submission:received', (submission: GitHubSubmission) => {
      this.handleSubmission(submission);
    });
  }

  async validateProtocol(protocol: CommunityProtocol): Promise<ValidationResult> {
    try {
      const result = await this.validator.validate(protocol);
      logger.debug(`Protocol validation result for ${protocol.name}:`, result);
      return result;
    } catch (error) {
      logger.error(`Protocol validation failed for ${protocol.name}:`, error);
      throw error;
    }
  }

  async loadProtocol(protocol: CommunityProtocol): Promise<LoadedProtocol> {
    try {
      // First validate the protocol
      const validationResult = await this.validateProtocol(protocol);
      if (!validationResult.valid) {
        throw new Error(`Protocol validation failed: ${validationResult.errors.map((e: any) => e.message).join(', ')}`);
      }

      // Load the protocol
      const loadedProtocol = await this.loader.load(protocol);
      this.loadedProtocols.set(protocol.name, loadedProtocol);

      logger.info(`Successfully loaded protocol: ${protocol.name}@${protocol.version}`);
      return loadedProtocol;
    } catch (error) {
      logger.error(`Failed to load protocol ${protocol.name}:`, error);
      throw error;
    }
  }

  async unloadProtocol(name: string): Promise<void> {
    try {
      const protocol = this.loadedProtocols.get(name);
      if (!protocol) {
        throw new Error(`Protocol not found: ${name}`);
      }

      await this.loader.unload(name);
      this.loadedProtocols.delete(name);
      this.emit('protocol:unloaded', name);

      logger.info(`Successfully unloaded protocol: ${name}`);
    } catch (error) {
      logger.error(`Failed to unload protocol ${name}:`, error);
      throw error;
    }
  }

  getLoadedProtocols(): LoadedProtocol[] {
    return Array.from(this.loadedProtocols.values());
  }

  getProtocol(name: string): LoadedProtocol | undefined {
    return this.loadedProtocols.get(name);
  }

  isProtocolLoaded(name: string): boolean {
    return this.loadedProtocols.has(name);
  }

  async reloadProtocol(name: string): Promise<LoadedProtocol> {
    const existingProtocol = this.loadedProtocols.get(name);
    if (!existingProtocol) {
      throw new Error(`Protocol not found: ${name}`);
    }

    await this.unloadProtocol(name);
    return this.loadProtocol(existingProtocol.protocol);
  }

  private async handleSubmission(submission: GitHubSubmission): Promise<void> {
    try {
      logger.info(`Processing GitHub submission: PR #${submission.pullRequestNumber}`);

      // Load protocol from submission
      const protocol = await this.github.getProtocolFromSubmission(submission);
      
      // Validate protocol
      const validationResult = await this.validateProtocol(protocol);
      submission.validationResults = validationResult;
      submission.updatedAt = new Date();

      if (validationResult.valid) {
        submission.status = 'validated';
        
        if (this.config.github.autoMerge && validationResult.errors.length === 0) {
          submission.status = 'approved';
          await this.github.approveSubmission(submission);
          logger.info(`Auto-approved submission: PR #${submission.pullRequestNumber}`);
        } else {
          await this.github.updateSubmissionStatus(submission);
          logger.info(`Validated submission: PR #${submission.pullRequestNumber}`);
        }
      } else {
        submission.status = 'rejected';
        await this.github.rejectSubmission(submission, validationResult);
        logger.warn(`Rejected submission: PR #${submission.pullRequestNumber}`);
      }

      this.emit('submission:processed', submission);
    } catch (error) {
      logger.error(`Failed to process submission PR #${submission.pullRequestNumber}:`, error);
      submission.status = 'rejected';
      await this.github.rejectSubmission(submission, {
        valid: false,
        errors: [{
          code: 'PROCESSING_ERROR',
          message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          path: '',
          severity: 'error'
        }],
        warnings: []
      });
      this.emit('submission:processed', submission);
    }
  }

  async getSubmissionHistory(): Promise<GitHubSubmission[]> {
    return this.github.getSubmissionHistory();
  }

  getStats(): {
    loadedProtocols: number;
    totalTools: number;
    successfulSubmissions: number;
    failedSubmissions: number;
  } {
    const loadedProtocols = this.loadedProtocols.size;
    const totalTools = Array.from(this.loadedProtocols.values())
      .reduce((sum, protocol) => sum + protocol.tools.length, 0);

    return {
      loadedProtocols,
      totalTools,
      successfulSubmissions: 0, // TODO: Implement tracking
      failedSubmissions: 0 // TODO: Implement tracking
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down CommunityManager...');
    
    // Unload all protocols
    const protocols = Array.from(this.loadedProtocols.keys());
    await Promise.all(protocols.map(name => this.unloadProtocol(name)));
    
    // Cleanup components
    await this.loader.shutdown();
    await this.github.shutdown();
    
    this.removeAllListeners();
    logger.info('CommunityManager shutdown complete');
  }
}