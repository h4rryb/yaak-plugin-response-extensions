import type { PluginDefinition, Context, CallTemplateFunctionArgs, HttpRequest, HttpResponse, RenderPurpose, FormInput } from '@yaakapp/api';
import { readFileSync } from 'node:fs';

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

/**
 * Get the appropriate response for a request based on behavior and purpose
 */
async function getResponse(
  ctx: Context,
  options: {
    requestId: string;
    purpose: RenderPurpose;
    behavior: string | null;
  }
): Promise<HttpResponse | null> {
  const { requestId, purpose, behavior } = options;

  if (!requestId) return null;

  const httpRequest = await ctx.httpRequest.getById({ id: requestId });
  if (httpRequest == null) {
    return null;
  }

  const responses = await ctx.httpResponse.find({ requestId: httpRequest.id });

  // Check if we should send the request
  const shouldSend =
    behavior === 'always' ||
    (behavior === 'smart' && purpose === 'send' && responses.length === 0);

  if (shouldSend) {
    try {
      await ctx.httpRequest.send({ id: httpRequest.id });
      // Re-fetch responses after sending
      const newResponses = await ctx.httpResponse.find({ requestId: httpRequest.id });
      return newResponses[0] ?? null;
    } catch (err) {
      console.error('Failed to send request:', err);
      return null;
    }
  }

  return responses[0] ?? null;
}

const requestArg: FormInput = {
  type: 'http_request',
  name: 'request',
  label: 'Source Request',
};

const behaviorArg: FormInput = {
  type: 'select',
  name: 'behavior',
  label: 'Sending Behavior',
  defaultValue: 'smart',
  options: [
    { label: 'When no responses', value: 'smart' },
    { label: 'Always', value: 'always' },
    { label: 'Never', value: 'never' },
  ],
};

export const plugin: PluginDefinition = {
  templateFunctions: [
    {
      name: 'responseExtensions.oauth2',
      description: 'Extract OAuth2 token details from a request (accessToken, refreshToken, etc.)',
      args: [
        requestArg,
        {
          type: 'text',
          name: 'filter',
          label: 'JSONPath Filter',
          placeholder: '$.accessToken',
          defaultValue: '$.accessToken',
        },
        behaviorArg,
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
          const filter = args.values.filter || '$.accessToken';
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
          type: 'text',
          name: 'filter',
          label: 'JSONPath Filter',
          placeholder: '$.statusCode',
          defaultValue: '$.statusCode',
        },
        behaviorArg,
      ],
      async onRender(ctx: Context, args: CallTemplateFunctionArgs): Promise<string | null> {
        if (!args.values.request) return null;

        try {
          const response = await getResponse(ctx, {
            requestId: args.values.request,
            purpose: args.purpose,
            behavior: args.values.behavior ?? 'smart',
          });

          if (response == null) return null;

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
          const filter = args.values.filter || '$.statusCode';
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
      name: 'responseExtensions.body',
      description: 'Extract data from response body using JSONPath',
      args: [
        requestArg,
        {
          type: 'text',
          name: 'filter',
          label: 'JSONPath Filter',
          placeholder: '$.token',
          defaultValue: '$',
        },
        behaviorArg,
      ],
      async onRender(ctx: Context, args: CallTemplateFunctionArgs): Promise<string | null> {
        if (!args.values.request) return null;

        try {
          const response = await getResponse(ctx, {
            requestId: args.values.request,
            purpose: args.purpose,
            behavior: args.values.behavior ?? 'smart',
          });

          if (response == null || response.bodyPath == null) return null;

          // Read the response body
          let body;
          try {
            body = readFileSync(response.bodyPath, 'utf-8');
          } catch (err) {
            console.error('Failed to read response body:', err);
            return null;
          }

          // Try to parse as JSON
          let bodyData;
          try {
            bodyData = JSON.parse(body);
          } catch (err) {
            // If not JSON, return as string if filter is $
            if (args.values.filter === '$' || !args.values.filter) {
              return body;
            }
            console.error('Response body is not JSON:', err);
            return null;
          }

          // Apply JSONPath filter
          const filter = args.values.filter || '$';
          const result = applyJSONPath(bodyData, filter);

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
          console.error('Error extracting body data:', error);
          return null;
        }
      },
    },
    {
      name: 'responseExtensions',
      description: 'Generic response extensions - access OAuth2, response metadata, or body',
      args: [
        requestArg,
        {
          type: 'select',
          name: 'attribute',
          label: 'Attribute Type',
          defaultValue: 'body',
          options: [
            { label: 'Response Body', value: 'body' },
            { label: 'OAuth2 Token', value: 'oauth2' },
            { label: 'Response Metadata', value: 'response' },
          ],
        },
        {
          type: 'text',
          name: 'filter',
          label: 'JSONPath Filter',
          placeholder: '$.token',
          defaultValue: '$',
        },
        behaviorArg,
      ],
      async onRender(ctx: Context, args: CallTemplateFunctionArgs): Promise<string | null> {
        if (!args.values.request) return null;

        const attribute = args.values.attribute || 'body';

        // Delegate to the appropriate specialized function based on attribute type
        if (attribute === 'oauth2') {
          return plugin.templateFunctions![0].onRender(ctx, args);
        } else if (attribute === 'response') {
          return plugin.templateFunctions![1].onRender(ctx, args);
        } else if (attribute === 'body') {
          return plugin.templateFunctions![2].onRender(ctx, args);
        }

        return null;
      },
    },
  ],
};
