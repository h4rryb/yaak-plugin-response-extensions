import type { PluginDefinition, Context, CallTemplateFunctionArgs, HttpRequest, HttpResponse } from '@yaakapp/api';

/**
 * Yaak plugin to access extended response attributes including OAuth2 tokens
 * This replicates the functionality of insomnia-plugin-response-extensions
 */

/**
 * Simple JSONPath implementation for basic queries
 * Supports: $, $.field, $.array[0], $.nested.field
 */
function applyJSONPath(data: any, path: string): any {
  if (!path || path === '$') {
    return data;
  }

  // Remove leading $ and split by dots
  const parts = path.replace(/^\$\.?/, '').split('.');
  let result = data;

  for (const part of parts) {
    if (!part) continue;

    // Handle array indexing: field[0]
    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, fieldName, index] = arrayMatch;
      result = result?.[fieldName]?.[parseInt(index)];
    } else {
      result = result?.[part];
    }

    if (result === undefined || result === null) {
      return null;
    }
  }

  return result;
}

const requestArg = {
  type: 'http_request' as const,
  name: 'request',
  label: 'Source Request',
};

const pathArg = {
  type: 'text' as const,
  name: 'path',
  label: 'JSONPath Filter',
  placeholder: '$.accessToken',
};

export const plugin: PluginDefinition = {
  templateFunctions: [
    {
      name: 'responseExtensions.oauth2',
      description: 'Extract OAuth2 token details from a request (accessToken, refreshToken, etc.)',
      args: [
        requestArg,
        {
          type: 'text' as const,
          name: 'filter',
          label: 'JSONPath Filter',
          placeholder: '$.accessToken',
          defaultValue: '$',
        },
      ],
      async onRender(ctx: Context, args: CallTemplateFunctionArgs): Promise<string | null> {
        if (!args.values.request) return null;

        try {
          const httpRequest = await ctx.httpRequest.getById({ id: args.values.request });
          if (!httpRequest) return null;

          // Get OAuth2 authentication data from the request
          const auth = httpRequest.authentication;
          
          // Check if this request uses OAuth2 authentication
          if (!auth || auth.type !== 'oauth2') {
            console.error('Request does not have OAuth2 authentication configured');
            return null;
          }

          // Build OAuth2 data object similar to Insomnia's structure
          const oauth2Data = {
            type: 'OAuth2Token',
            parentId: httpRequest.id,
            modified: httpRequest.updatedAt,
            created: httpRequest.createdAt,
            accessToken: auth.accessToken || null,
            refreshToken: auth.refreshToken || null,
            identityToken: auth.identityToken || null,
            expiresAt: auth.expiresAt || null,
            error: auth.error || null,
            errorDescription: auth.errorDescription || null,
            errorUri: auth.errorUri || null,
          };

          // Apply JSONPath filter
          const filter = args.values.filter || '$';
          const result = applyJSONPath(oauth2Data, filter);

          if (result !== null && result !== undefined) {
            // If result is an object or array, stringify it
            if (typeof result === 'object') {
              return JSON.stringify(result);
            }
            // Otherwise return as string
            return String(result);
          }

          return null;
        } catch (error) {
          console.error('Error extracting OAuth2 data:', error);
          return null;
        }
      },
    },
    {
      name: 'responseExtensions.response',
      description: 'Extract extended response metadata (statusCode, headers, contentType, etc.)',
      args: [
        requestArg,
        {
          type: 'text' as const,
          name: 'filter',
          label: 'JSONPath Filter',
          placeholder: '$.statusCode',
          defaultValue: '$',
        },
      ],
      async onRender(ctx: Context, args: CallTemplateFunctionArgs): Promise<string | null> {
        if (!args.values.request) return null;

        try {
          const httpRequest = await ctx.httpRequest.getById({ id: args.values.request });
          if (!httpRequest) return null;

          // Get the most recent response for this request
          const responses = await ctx.httpResponse.find({ requestId: httpRequest.id });
          if (!responses || responses.length === 0) return null;

          // Use the most recent response
          const response = responses[0];

          // Build response metadata object similar to Insomnia's structure
          const responseData = {
            _id: response.id,
            type: 'Response',
            parentId: response.requestId,
            modified: response.updatedAt,
            created: response.createdAt,
            statusCode: response.status,
            statusMessage: response.statusText || '',
            contentType: response.contentType || '',
            url: response.url || '',
            headers: response.headers || [],
            elapsedTime: response.elapsed || 0,
            bytesRead: response.size || 0,
          };

          // Apply JSONPath filter
          const filter = args.values.filter || '$';
          const result = applyJSONPath(responseData, filter);

          if (result !== null && result !== undefined) {
            // If result is an object or array, stringify it
            if (typeof result === 'object') {
              return JSON.stringify(result);
            }
            // Otherwise return as string
            return String(result);
          }

          return null;
        } catch (error) {
          console.error('Error extracting response data:', error);
          return null;
        }
      },
    },
    {
      name: 'responseExtensions',
      description: 'Generic response extensions - access OAuth2 or response metadata',
      args: [
        requestArg,
        {
          type: 'select' as const,
          name: 'attribute',
          label: 'Attribute Type',
          defaultValue: 'oauth2',
          options: [
            { label: 'OAuth2 Token', value: 'oauth2' },
            { label: 'Response Metadata', value: 'response' },
          ],
        },
        {
          type: 'text' as const,
          name: 'filter',
          label: 'JSONPath Filter',
          placeholder: '$.accessToken',
          defaultValue: '$',
        },
      ],
      async onRender(ctx: Context, args: CallTemplateFunctionArgs): Promise<string | null> {
        if (!args.values.request) return null;

        const attribute = args.values.attribute || 'oauth2';

        // Delegate to the appropriate specialized function
        if (attribute === 'oauth2') {
          return plugin.templateFunctions![0].onRender(ctx, args);
        } else if (attribute === 'response') {
          return plugin.templateFunctions![1].onRender(ctx, args);
        }

        return null;
      },
    },
  ],
};
