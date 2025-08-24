import { ProtocolTemplate } from '../types/index.js';

export const protocolTemplates: ProtocolTemplate[] = [
  {
    name: 'REST API',
    description: 'Template for creating a REST API protocol',
    category: 'API',
    template: {
      name: '{{PROTOCOL_NAME}}',
      version: '1.0.0',
      description: '{{PROTOCOL_DESCRIPTION}}',
      author: '{{AUTHOR_NAME}}',
      license: 'MIT',
      authentication: {
        type: 'api_key',
        location: 'header',
        name: 'X-API-Key',
      },
      rateLimit: {
        requests: 1000,
        window: '1h',
      },
      endpoints: [
        {
          name: 'getData',
          method: 'GET',
          path: '/api/v1/data',
          description: 'Retrieve data from the API',
          parameters: [
            {
              name: 'limit',
              type: 'number',
              description: 'Maximum number of items to return',
              required: false,
              default: 100,
              minimum: 1,
              maximum: 1000,
            },
          ],
          response: {
            type: 'object',
            description: 'API response containing data',
            properties: {
              data: {
                type: 'array',
                description: 'Array of data items',
                required: true,
                items: {
                  type: 'object',
                  description: 'Individual data item',
                  required: true,
                },
              },
              total: {
                type: 'number',
                description: 'Total number of items available',
                required: true,
              },
            },
          },
          authentication: true,
        },
      ],
    },
    placeholders: {
      '{{PROTOCOL_NAME}}': 'Protocol name (e.g., my-api)',
      '{{PROTOCOL_DESCRIPTION}}': 'Brief description of what your protocol does',
      '{{AUTHOR_NAME}}': 'Your name or organization',
    },
    instructions: [
      'Replace all placeholder values with your specific information',
      'Add additional endpoints as needed',
      'Configure authentication method based on your API requirements',
      'Set appropriate rate limits for your use case',
      'Test your protocol before submission',
    ],
  },

  {
    name: 'GraphQL API',
    description: 'Template for creating a GraphQL API protocol',
    category: 'API',
    template: {
      name: '{{PROTOCOL_NAME}}',
      version: '1.0.0',
      description: '{{PROTOCOL_DESCRIPTION}}',
      author: '{{AUTHOR_NAME}}',
      license: 'MIT',
      authentication: {
        type: 'bearer_token',
      },
      endpoints: [
        {
          name: 'query',
          method: 'POST',
          path: '/graphql',
          description: 'Execute GraphQL query',
          parameters: [
            {
              name: 'query',
              type: 'string',
              description: 'GraphQL query string',
              required: true,
            },
            {
              name: 'variables',
              type: 'object',
              description: 'Query variables',
              required: false,
            },
            {
              name: 'operationName',
              type: 'string',
              description: 'Operation name for multi-operation queries',
              required: false,
            },
          ],
          response: {
            type: 'object',
            description: 'GraphQL response',
            properties: {
              data: {
                type: 'object',
                description: 'Query result data',
                required: false,
              },
              errors: {
                type: 'array',
                description: 'Array of error objects',
                required: false,
                items: {
                  type: 'object',
                  description: 'GraphQL error',
                  required: true,
                },
              },
            },
          },
          authentication: true,
        },
      ],
    },
    placeholders: {
      '{{PROTOCOL_NAME}}': 'Protocol name (e.g., my-graphql-api)',
      '{{PROTOCOL_DESCRIPTION}}': 'Brief description of your GraphQL API',
      '{{AUTHOR_NAME}}': 'Your name or organization',
    },
    instructions: [
      'Replace placeholder values with your GraphQL API details',
      'Consider adding introspection endpoint if supported',
      'Configure authentication based on your requirements',
      'Add schema documentation in metadata if available',
    ],
  },

  {
    name: 'WebSocket API',
    description: 'Template for creating a WebSocket-based protocol',
    category: 'Real-time',
    template: {
      name: '{{PROTOCOL_NAME}}',
      version: '1.0.0',
      description: '{{PROTOCOL_DESCRIPTION}}',
      author: '{{AUTHOR_NAME}}',
      license: 'MIT',
      authentication: {
        type: 'bearer_token',
      },
      endpoints: [
        {
          name: 'connect',
          method: 'POST',
          path: '/ws/connect',
          description: 'Establish WebSocket connection',
          parameters: [
            {
              name: 'channels',
              type: 'array',
              description: 'List of channels to subscribe to',
              required: false,
              items: {
                type: 'string',
                description: 'Channel name',
                required: true,
              },
            },
          ],
          response: {
            type: 'object',
            description: 'Connection response',
            properties: {
              connectionId: {
                type: 'string',
                description: 'Unique connection identifier',
                required: true,
              },
              status: {
                type: 'string',
                description: 'Connection status',
                required: true,
              },
            },
          },
          authentication: true,
        },
        {
          name: 'subscribe',
          method: 'POST',
          path: '/ws/subscribe',
          description: 'Subscribe to a channel',
          parameters: [
            {
              name: 'channel',
              type: 'string',
              description: 'Channel name to subscribe to',
              required: true,
            },
            {
              name: 'filters',
              type: 'object',
              description: 'Optional filters for the subscription',
              required: false,
            },
          ],
          response: {
            type: 'object',
            description: 'Subscription response',
            properties: {
              subscriptionId: {
                type: 'string',
                description: 'Unique subscription identifier',
                required: true,
              },
              status: {
                type: 'string',
                description: 'Subscription status',
                required: true,
              },
            },
          },
          authentication: true,
        },
      ],
    },
    placeholders: {
      '{{PROTOCOL_NAME}}': 'Protocol name (e.g., my-websocket-api)',
      '{{PROTOCOL_DESCRIPTION}}': 'Brief description of your WebSocket API',
      '{{AUTHOR_NAME}}': 'Your name or organization',
    },
    instructions: [
      'Replace placeholder values with your WebSocket API details',
      'Add additional message types as endpoints',
      'Consider connection lifecycle management',
      'Define message schemas for real-time events',
    ],
  },

  {
    name: 'Webhook Receiver',
    description: 'Template for creating a webhook receiver protocol',
    category: 'Integration',
    template: {
      name: '{{PROTOCOL_NAME}}',
      version: '1.0.0',
      description: '{{PROTOCOL_DESCRIPTION}}',
      author: '{{AUTHOR_NAME}}',
      license: 'MIT',
      authentication: {
        type: 'api_key',
        location: 'header',
        name: 'X-Webhook-Secret',
      },
      endpoints: [
        {
          name: 'receiveWebhook',
          method: 'POST',
          path: '/webhook',
          description: 'Receive webhook payload',
          parameters: [
            {
              name: 'event_type',
              type: 'string',
              description: 'Type of event being sent',
              required: true,
              enum: ['created', 'updated', 'deleted', 'action_performed'],
            },
            {
              name: 'payload',
              type: 'object',
              description: 'Event payload data',
              required: true,
            },
            {
              name: 'timestamp',
              type: 'string',
              description: 'ISO 8601 timestamp of the event',
              required: true,
              pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$',
            },
          ],
          response: {
            type: 'object',
            description: 'Webhook acknowledgment',
            properties: {
              received: {
                type: 'boolean',
                description: 'Whether the webhook was received successfully',
                required: true,
              },
              processed_at: {
                type: 'string',
                description: 'ISO 8601 timestamp when processed',
                required: true,
              },
            },
          },
          authentication: true,
        },
      ],
    },
    placeholders: {
      '{{PROTOCOL_NAME}}': 'Protocol name (e.g., my-webhook-receiver)',
      '{{PROTOCOL_DESCRIPTION}}': 'Brief description of your webhook receiver',
      '{{AUTHOR_NAME}}': 'Your name or organization',
    },
    instructions: [
      'Replace placeholder values with your webhook details',
      'Update event_type enum with your specific event types',
      'Configure authentication method (signature verification recommended)',
      'Add validation for expected payload structure',
    ],
  },

  {
    name: 'File Upload API',
    description: 'Template for creating a file upload protocol',
    category: 'Storage',
    template: {
      name: '{{PROTOCOL_NAME}}',
      version: '1.0.0',
      description: '{{PROTOCOL_DESCRIPTION}}',
      author: '{{AUTHOR_NAME}}',
      license: 'MIT',
      authentication: {
        type: 'bearer_token',
      },
      rateLimit: {
        requests: 100,
        window: '1h',
      },
      endpoints: [
        {
          name: 'uploadFile',
          method: 'POST',
          path: '/upload',
          description: 'Upload a file',
          parameters: [
            {
              name: 'file',
              type: 'string',
              description: 'File content (base64 encoded)',
              required: true,
            },
            {
              name: 'filename',
              type: 'string',
              description: 'Name of the file',
              required: true,
            },
            {
              name: 'content_type',
              type: 'string',
              description: 'MIME type of the file',
              required: false,
            },
            {
              name: 'metadata',
              type: 'object',
              description: 'Additional file metadata',
              required: false,
            },
          ],
          response: {
            type: 'object',
            description: 'Upload response',
            properties: {
              file_id: {
                type: 'string',
                description: 'Unique file identifier',
                required: true,
              },
              download_url: {
                type: 'string',
                description: 'URL to download the file',
                required: true,
              },
              size: {
                type: 'number',
                description: 'File size in bytes',
                required: true,
              },
              uploaded_at: {
                type: 'string',
                description: 'ISO 8601 upload timestamp',
                required: true,
              },
            },
          },
          authentication: true,
          rateLimit: {
            requests: 10,
            window: '1m',
          },
        },
        {
          name: 'getFileInfo',
          method: 'GET',
          path: '/files/{file_id}',
          description: 'Get file information',
          parameters: [
            {
              name: 'file_id',
              type: 'string',
              description: 'Unique file identifier',
              required: true,
            },
          ],
          response: {
            type: 'object',
            description: 'File information',
            properties: {
              file_id: {
                type: 'string',
                description: 'Unique file identifier',
                required: true,
              },
              filename: {
                type: 'string',
                description: 'Original filename',
                required: true,
              },
              content_type: {
                type: 'string',
                description: 'File MIME type',
                required: true,
              },
              size: {
                type: 'number',
                description: 'File size in bytes',
                required: true,
              },
              uploaded_at: {
                type: 'string',
                description: 'ISO 8601 upload timestamp',
                required: true,
              },
            },
          },
          authentication: true,
        },
      ],
    },
    placeholders: {
      '{{PROTOCOL_NAME}}': 'Protocol name (e.g., my-file-storage)',
      '{{PROTOCOL_DESCRIPTION}}': 'Brief description of your file upload service',
      '{{AUTHOR_NAME}}': 'Your name or organization',
    },
    instructions: [
      'Replace placeholder values with your file service details',
      'Consider file size limits and supported formats',
      'Add file deletion endpoint if needed',
      'Configure appropriate rate limits for file uploads',
      'Consider using multipart/form-data for large files',
    ],
  },
];

export function getTemplate(name: string): ProtocolTemplate | undefined {
  return protocolTemplates.find((template) => template.name === name);
}

export function getTemplatesByCategory(category: string): ProtocolTemplate[] {
  return protocolTemplates.filter((template) => template.category === category);
}

export function getAllTemplates(): ProtocolTemplate[] {
  return [...protocolTemplates];
}

export function getTemplateCategories(): string[] {
  const categories = new Set(protocolTemplates.map((template) => template.category));
  return Array.from(categories).sort();
}
