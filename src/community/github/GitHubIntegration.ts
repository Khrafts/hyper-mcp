import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';
import { CommunityProtocol, GitHubSubmission, ValidationResult } from '../types/index.js';

export interface GitHubConfig {
  repository: string;
  token?: string;
  webhookSecret?: string;
  autoMerge: boolean;
}

export interface PullRequestInfo {
  number: number;
  author: string;
  title: string;
  body: string;
  changedFiles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class GitHubIntegration extends EventEmitter {
  private github: AxiosInstance | null = null;
  private config: GitHubConfig;
  private owner: string;
  private repo: string;
  private submissions: Map<number, GitHubSubmission> = new Map();

  constructor(config: GitHubConfig) {
    super();
    this.config = config;

    // Parse repository string (format: owner/repo)
    const [owner, repo] = config.repository.split('/');
    if (!owner || !repo) {
      throw new Error('Invalid repository format. Expected: owner/repo');
    }
    this.owner = owner;
    this.repo = repo;

    // Initialize GitHub client if token is provided
    if (config.token) {
      this.github = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
          Authorization: `token ${config.token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'HyperMCP-Community-Bot/1.0',
        },
        timeout: 30000,
      });
    } else {
      logger.warn('GitHub token not provided. Limited functionality available.');
    }

    logger.debug('GitHubIntegration initialized', {
      repository: config.repository,
      hasToken: !!config.token,
    });
  }

  async handleWebhook(payload: any, signature?: string): Promise<void> {
    try {
      // Verify webhook signature if secret is configured
      if (this.config.webhookSecret && signature) {
        this.verifyWebhookSignature(payload, signature);
      }

      const { action, pull_request } = payload;

      if (pull_request && ['opened', 'synchronize', 'reopened'].includes(action)) {
        await this.handlePullRequest(pull_request);
      }

      logger.debug('Webhook processed successfully', { action, pr: pull_request?.number });
    } catch (error) {
      logger.error('Failed to process webhook:', error);
      throw error;
    }
  }

  private verifyWebhookSignature(payload: any, signature: string): void {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const receivedSignature = signature.replace('sha256=', '');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      )
    ) {
      throw new Error('Invalid webhook signature');
    }
  }

  private async handlePullRequest(pullRequest: any): Promise<void> {
    try {
      const submission: GitHubSubmission = {
        pullRequestNumber: pullRequest.number,
        author: pullRequest.user.login,
        protocolPath: await this.findProtocolPath(pullRequest.number),
        status: 'pending',
        createdAt: new Date(pullRequest.created_at),
        updatedAt: new Date(pullRequest.updated_at),
      };

      this.submissions.set(pullRequest.number, submission);
      this.emit('submission:received', submission);

      logger.info(
        `New protocol submission received: PR #${pullRequest.number} by ${pullRequest.user.login}`
      );
    } catch (error) {
      logger.error(`Failed to handle pull request #${pullRequest.number}:`, error);
      throw error;
    }
  }

  async getProtocolFromSubmission(submission: GitHubSubmission): Promise<CommunityProtocol> {
    if (!this.github) {
      throw new Error('GitHub token required for protocol retrieval');
    }

    try {
      logger.debug(`Retrieving protocol from PR #${submission.pullRequestNumber}`);

      // Get file content from the pull request
      const response = await this.github.get(
        `/repos/${this.owner}/${this.repo}/contents/${submission.protocolPath}`,
        {
          params: { ref: `pull/${submission.pullRequestNumber}/head` },
        }
      );

      const fileContent = response.data;
      if (fileContent.content) {
        const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');
        const protocol: CommunityProtocol = JSON.parse(content);

        logger.debug(`Successfully retrieved protocol: ${protocol.name}@${protocol.version}`);
        return protocol;
      } else {
        throw new Error(`Protocol file is not a file: ${submission.protocolPath}`);
      }
    } catch (error) {
      logger.error(`Failed to retrieve protocol from PR #${submission.pullRequestNumber}:`, error);
      throw error;
    }
  }

  private async findProtocolPath(prNumber: number): Promise<string> {
    if (!this.github) {
      throw new Error('GitHub token required for file discovery');
    }

    try {
      // Get list of files changed in the PR
      const response = await this.github.get(
        `/repos/${this.owner}/${this.repo}/pulls/${prNumber}/files`
      );
      const files = response.data;

      // Find protocol files (assuming .json extension and specific directory structure)
      const protocolFiles = files.filter(
        (file: any) =>
          file.filename.includes('protocols/') &&
          file.filename.endsWith('.json') &&
          file.status !== 'removed'
      );

      if (protocolFiles.length === 0) {
        throw new Error('No protocol files found in pull request');
      }

      if (protocolFiles.length > 1) {
        logger.warn(`Multiple protocol files found in PR #${prNumber}, using first one`);
      }

      return protocolFiles[0].filename;
    } catch (error) {
      logger.error(`Failed to find protocol path for PR #${prNumber}:`, error);
      throw error;
    }
  }

  async updateSubmissionStatus(submission: GitHubSubmission): Promise<void> {
    if (!this.github) {
      logger.warn('Cannot update submission status without GitHub token');
      return;
    }

    try {
      let comment = this.generateStatusComment(submission);

      // Add validation results if available
      if (submission.validationResults) {
        comment += this.generateValidationComment(submission.validationResults);
      }

      await this.github.post(
        `/repos/${this.owner}/${this.repo}/issues/${submission.pullRequestNumber}/comments`,
        {
          body: comment,
        }
      );

      // Update labels based on status
      await this.updatePullRequestLabels(submission);

      logger.info(`Updated status for PR #${submission.pullRequestNumber}: ${submission.status}`);
    } catch (error) {
      logger.error(
        `Failed to update submission status for PR #${submission.pullRequestNumber}:`,
        error
      );
      throw error;
    }
  }

  private generateStatusComment(submission: GitHubSubmission): string {
    const statusEmoji = {
      pending: '⏳',
      validated: '✅',
      approved: '🎉',
      rejected: '❌',
    };

    let comment = `## ${statusEmoji[submission.status as keyof typeof statusEmoji]} Protocol Validation Status: ${submission.status.toUpperCase()}\n\n`;
    comment += `**Submission Details:**\n`;
    comment += `- Author: @${submission.author}\n`;
    comment += `- Protocol Path: \`${submission.protocolPath}\`\n`;
    comment += `- Status: ${submission.status}\n`;
    comment += `- Updated: ${submission.updatedAt.toISOString()}\n\n`;

    return comment;
  }

  private generateValidationComment(results: ValidationResult): string {
    let comment = `### Validation Results\n\n`;

    if (results.valid) {
      comment += `✅ **Validation Passed**\n\n`;
    } else {
      comment += `❌ **Validation Failed**\n\n`;
    }

    if (results.errors.length > 0) {
      comment += `**Errors (${results.errors.length}):**\n`;
      results.errors.forEach((error: any, index: number) => {
        comment += `${index + 1}. \`${error.code}\` - ${error.message}`;
        if (error.path) {
          comment += ` (Path: \`${error.path}\`)`;
        }
        comment += '\n';
      });
      comment += '\n';
    }

    if (results.warnings.length > 0) {
      comment += `**Warnings (${results.warnings.length}):**\n`;
      results.warnings.forEach((warning: any, index: number) => {
        comment += `${index + 1}. \`${warning.code}\` - ${warning.message}`;
        if (warning.path) {
          comment += ` (Path: \`${warning.path}\`)`;
        }
        comment += '\n';
      });
      comment += '\n';
    }

    if (results.valid) {
      comment += `The protocol has been successfully validated and is ready for review.\n\n`;
    } else {
      comment += `Please address the errors above and update your pull request.\n\n`;
    }

    comment += `---\n*This comment was automatically generated by the HyperMCP Community Validation System.*`;

    return comment;
  }

  private async updatePullRequestLabels(submission: GitHubSubmission): Promise<void> {
    if (!this.github) return;

    try {
      const labels: string[] = [];

      switch (submission.status) {
        case 'pending':
          labels.push('community-protocol', 'validation-pending');
          break;
        case 'validated':
          labels.push('community-protocol', 'validation-passed');
          break;
        case 'approved':
          labels.push('community-protocol', 'approved');
          break;
        case 'rejected':
          labels.push('community-protocol', 'validation-failed');
          break;
      }

      await this.github.put(
        `/repos/${this.owner}/${this.repo}/issues/${submission.pullRequestNumber}/labels`,
        {
          labels,
        }
      );
    } catch (error) {
      logger.warn(`Failed to update labels for PR #${submission.pullRequestNumber}:`, error);
    }
  }

  async approveSubmission(submission: GitHubSubmission): Promise<void> {
    if (!this.github) {
      throw new Error('GitHub token required for approval');
    }

    try {
      // Add approval review
      await this.github.post(
        `/repos/${this.owner}/${this.repo}/pulls/${submission.pullRequestNumber}/reviews`,
        {
          event: 'APPROVE',
          body: 'Protocol validation passed. This submission has been automatically approved.',
        }
      );

      // Merge if auto-merge is enabled
      if (this.config.autoMerge) {
        await this.github.put(
          `/repos/${this.owner}/${this.repo}/pulls/${submission.pullRequestNumber}/merge`,
          {
            commit_title: `Add community protocol: ${submission.protocolPath}`,
            commit_message: 'Automatically merged after successful validation.',
            merge_method: 'squash',
          }
        );

        logger.info(`Auto-merged PR #${submission.pullRequestNumber}`);
      }

      submission.status = 'approved';
      submission.updatedAt = new Date();

      await this.updateSubmissionStatus(submission);
    } catch (error) {
      logger.error(`Failed to approve submission PR #${submission.pullRequestNumber}:`, error);
      throw error;
    }
  }

  async rejectSubmission(
    submission: GitHubSubmission,
    validationResult: ValidationResult
  ): Promise<void> {
    if (!this.github) {
      logger.warn('Cannot reject submission without GitHub token');
      return;
    }

    try {
      // Add rejection review
      await this.github.post(
        `/repos/${this.owner}/${this.repo}/pulls/${submission.pullRequestNumber}/reviews`,
        {
          event: 'REQUEST_CHANGES',
          body: 'Protocol validation failed. Please address the issues and update your submission.',
        }
      );

      submission.status = 'rejected';
      submission.validationResults = validationResult;
      submission.updatedAt = new Date();

      await this.updateSubmissionStatus(submission);

      logger.info(`Rejected PR #${submission.pullRequestNumber}`);
    } catch (error) {
      logger.error(`Failed to reject submission PR #${submission.pullRequestNumber}:`, error);
      throw error;
    }
  }

  async getSubmissionHistory(): Promise<GitHubSubmission[]> {
    return Array.from(this.submissions.values());
  }

  async getPullRequestInfo(prNumber: number): Promise<PullRequestInfo | null> {
    if (!this.github) {
      throw new Error('GitHub token required for pull request info');
    }

    try {
      const prResponse = await this.github.get(
        `/repos/${this.owner}/${this.repo}/pulls/${prNumber}`
      );
      const pr = prResponse.data;

      const filesResponse = await this.github.get(
        `/repos/${this.owner}/${this.repo}/pulls/${prNumber}/files`
      );
      const files = filesResponse.data;

      return {
        number: pr.number,
        author: pr.user?.login || 'unknown',
        title: pr.title,
        body: pr.body || '',
        changedFiles: files.map((f: any) => f.filename),
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
      };
    } catch (error) {
      logger.error(`Failed to get pull request info for #${prNumber}:`, error);
      return null;
    }
  }

  async createProtocolSubmissionTemplate(): Promise<string> {
    const template = `# Protocol Submission

Thank you for contributing to the HyperMCP Community Protocol ecosystem!

## Protocol Information

Please ensure your protocol file follows the required schema and includes:

- ✅ **name**: Unique protocol identifier
- ✅ **version**: Semantic version (e.g., 1.0.0)
- ✅ **description**: Clear description of what your protocol does
- ✅ **author**: Your name or organization
- ✅ **license**: Open source license
- ✅ **endpoints**: At least one endpoint definition

## Submission Checklist

- [ ] Protocol file is placed in \`protocols/\` directory
- [ ] Protocol follows the schema specification
- [ ] All endpoints are properly documented
- [ ] Authentication requirements are specified (if any)
- [ ] Rate limiting is configured appropriately
- [ ] Tests are included (recommended)

## Validation Process

Your submission will be automatically validated for:

1. **Schema Compliance**: Ensures your protocol follows the required structure
2. **Security Review**: Checks for potential security issues
3. **Naming Conflicts**: Verifies your protocol name is unique
4. **Best Practices**: Reviews for recommended patterns

## Questions?

If you have questions about the submission process, please:

1. Review the [Contributing Guide](CONTRIBUTING.md)
2. Check existing protocol examples in the \`protocols/\` directory
3. Open an issue for clarification

---
*This template is automatically maintained by the HyperMCP Community System.*`;

    return template;
  }

  getStats(): {
    totalSubmissions: number;
    pendingSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
    averageProcessingTime?: number;
  } {
    const submissions = Array.from(this.submissions.values());

    return {
      totalSubmissions: submissions.length,
      pendingSubmissions: submissions.filter((s) => s.status === 'pending').length,
      approvedSubmissions: submissions.filter((s) => s.status === 'approved').length,
      rejectedSubmissions: submissions.filter((s) => s.status === 'rejected').length,
      // TODO: Calculate average processing time
      averageProcessingTime: undefined,
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down GitHubIntegration...');

    // Clear submissions cache
    this.submissions.clear();

    // Remove all listeners
    this.removeAllListeners();

    logger.info('GitHubIntegration shutdown complete');
  }
}
