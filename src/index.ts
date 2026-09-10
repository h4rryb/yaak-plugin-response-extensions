import type {
  PluginDefinition,
  Context,
  CallTemplateFunctionArgs,
  HttpResponse,
  HttpResponseBody,
  RenderPurpose,
  FormInput,
} from '@yaakapp/api';

/**
 * Yaak plugin to access extended response attributes including OAuth2 tokens.
 * This replicates the functionality of insomnia-plugin-response-extensions.
 *
 * Requires @yaakapp/api >= 0.9.0 (Yaak 2026.7.1+), where:
 *   - `ctx.httpRequest.send()` resolves to `{ httpResponse, body }`
 *   - `HttpResponse.bodyPath` no longer exists
 *   - bodies are read via `ctx.httpResponse.body({ responseId })`
 */

/**
 * Simple JSONPath implementation for basic queries.
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
      result = result?.[fieldName]?.[parseInt(index, 10)];
    } else {
      result = result?.[part];
    }

    if (result === undefined || result === null) {
      return null;
    }
  }

  return result;
}

/** Render a JSONPath result as the string Yaak will substitute into the template. */
function renderResult(result: any): string | null {
  if (result === null || result === undefined) return null;
  return typeof result === 'object' ? JSON.stringify(result) : String(result);
}

/** Case-insensitive response header lookup. */
function headerValue(
  headers: HttpResponse['headers'] | null | undefined,
  name: string,
): string | null {
  const wanted = name.toLowerCase();
  for (const header of headers ?? []) {
    if (header.name?.toLowerCase() === wanted) return header.value;
  }
  return null;
}

/** Read a template arg as a string, treating empty/absent as undefined. */
function stringArg(args: CallTemplateFunctionArgs, name: string): string | undefined {
  const value = args.values[name];
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

/**
 * A response plus a lazy handle on its body.
 *
 * The body is deliberately not opened up front: `responseExtensions.response`
 * only needs metadata, and opening a body it never reads costs a round trip.
 */
interface ResolvedResponse {
  httpResponse: HttpResponse;
  body: () => Promise<HttpResponseBody>;
}

/**
 * Get the appropriate response for a request based on behavior and purpose.
 */
async function resolveResponse(
  ctx: Context,
  options: {
    requestId: string;
    purpose: RenderPurpose;
    behavior: string | null;
  },
): Promise<ResolvedResponse | null> {
  const { requestId, purpose, behavior } = options;

  if (!requestId) return null;

  const httpRequest = await ctx.httpRequest.getById({ id: requestId });
  if (httpRequest == null) {
    return null;
  }

  const existing = await ctx.httpResponse.find({ requestId: httpRequest.id, limit: 1 });

  // Yaak calls onRender with purpose 'preview' continuously while a request tab
  // is simply open, to keep template-tag previews live — not only on actual
  // Send. 'always' must not act on every one of those, or opening a request
  // silently re-sends the source request in a loop, hanging on anything slow.
  // Matches Yaak's own built-in response plugin: 'always' is downgraded to
  // 'smart' during preview.
  const effectiveBehavior = behavior === 'always' && purpose === 'preview' ? 'smart' : behavior;

  const shouldSend =
    effectiveBehavior === 'always' ||
    (effectiveBehavior === 'smart' && existing.length === 0);

  if (shouldSend) {
    try {
      // Render the outgoing request's own template tags first. This must stay
      // inside this branch — rendering unconditionally here would recurse into
      // this same function (render -> render -> ...).
      const renderedHttpRequest = await ctx.httpRequest.render({ httpRequest, purpose });

      // send() takes the request itself, and now resolves to { httpResponse, body }.
      // The body is handed over here rather than looked up afterwards.
      const sent = await ctx.httpRequest.send({ httpRequest: renderedHttpRequest });
      return {
        httpResponse: sent.httpResponse,
        body: async () => sent.body,
      };
    } catch (err) {
      console.error('[response-extensions] Failed to send request:', err);
      return null;
    }
  }

  const httpResponse = existing[0];
  if (httpResponse == null) return null;

  return {
    httpResponse,
    // Saved responses are looked up by id; where the host keeps the bytes is not
    // something the plugin needs to know.
    body: async () => ctx.httpResponse.body({ responseId: httpResponse.id }),
  };
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

/**
 * Extract OAuth2 token details from a request's authentication config.
 */
async function renderOAuth2(
  ctx: Context,
  args: CallTemplateFunctionArgs,
): Promise<string | null> {
  const requestId = stringArg(args, 'request');
  if (!requestId) return null;

  try {
    const httpRequest = await ctx.httpRequest.getById({ id: requestId });
    if (!httpRequest) return null;

    // `authenticationType` names the scheme; `authentication` holds its config.
    if (httpRequest.authenticationType !== 'oauth2') {
      console.error(
        '[response-extensions] Request does not have OAuth2 authentication configured',
      );
      return null;
    }

    const auth: Record<string, any> = httpRequest.authentication ?? {};

    // Build OAuth2 data object similar to Insomnia's structure
    const oauth2Data = {
      type: 'OAuth2Token',
      parentId: httpRequest.id,
      modified: httpRequest.updatedAt,
      created: httpRequest.createdAt,
      accessToken: auth.accessToken ?? null,
      refreshToken: auth.refreshToken ?? null,
      identityToken: auth.identityToken ?? null,
      expiresAt: auth.expiresAt ?? null,
      error: auth.error ?? null,
      errorDescription: auth.errorDescription ?? null,
      errorUri: auth.errorUri ?? null,
    };

    return renderResult(applyJSONPath(oauth2Data, stringArg(args, 'filter') ?? '$.accessToken'));
  } catch (error) {
    console.error('[response-extensions] Error extracting OAuth2 data:', error);
    return null;
  }
}

/**
 * Extract extended response metadata.
 */
async function renderResponseMeta(
  ctx: Context,
  args: CallTemplateFunctionArgs,
): Promise<string | null> {
  const requestId = stringArg(args, 'request');
  if (!requestId) return null;

  try {
    const resolved = await resolveResponse(ctx, {
      requestId,
      purpose: args.purpose,
      behavior: stringArg(args, 'behavior') ?? 'smart',
    });

    if (resolved == null) return null;

    const response = resolved.httpResponse;

    // Build response metadata object similar to Insomnia's structure
    const responseData = {
      _id: response.id,
      type: 'Response',
      parentId: response.requestId,
      modified: response.updatedAt,
      created: response.createdAt,
      statusCode: response.status,
      statusMessage: response.statusReason ?? '',
      contentType: headerValue(response.headers, 'content-type') ?? '',
      url: response.url ?? '',
      headers: response.headers ?? [],
      elapsedTime: response.elapsed ?? 0,
      bytesRead: response.contentLength ?? 0,
      remoteAddr: response.remoteAddr ?? null,
      httpVersion: response.version ?? null,
      state: response.state,
      error: response.error ?? null,
    };

    return renderResult(applyJSONPath(responseData, stringArg(args, 'filter') ?? '$.statusCode'));
  } catch (error) {
    console.error('[response-extensions] Error extracting response data:', error);
    return null;
  }
}

/**
 * Extract data from a response body using JSONPath.
 */
async function renderBody(
  ctx: Context,
  args: CallTemplateFunctionArgs,
): Promise<string | null> {
  const requestId = stringArg(args, 'request');
  if (!requestId) return null;

  try {
    const resolved = await resolveResponse(ctx, {
      requestId,
      purpose: args.purpose,
      behavior: stringArg(args, 'behavior') ?? 'smart',
    });

    if (resolved == null) return null;

    if (resolved.httpResponse.error) {
      console.error(
        '[response-extensions] Source request failed:',
        resolved.httpResponse.error,
      );
      return null;
    }

    const filter = stringArg(args, 'filter') ?? '$';

    // Read the response body. This waits for a response that is still arriving.
    let text: string;
    try {
      const body = await resolved.body();
      text = await body.text();
    } catch (err) {
      console.error('[response-extensions] Failed to read response body:', err);
      return null;
    }

    // Try to parse as JSON
    let bodyData: unknown;
    try {
      bodyData = JSON.parse(text);
    } catch (err) {
      // If not JSON, return the raw text when the filter is the root
      if (filter === '$') {
        return text;
      }
      console.error('[response-extensions] Response body is not JSON:', err);
      return null;
    }

    return renderResult(applyJSONPath(bodyData, filter));
  } catch (error) {
    console.error('[response-extensions] Error extracting body data:', error);
    return null;
  }
}

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
      previewArgs: ['request', 'filter'],
      onRender: renderOAuth2,
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
      previewArgs: ['request', 'filter'],
      onRender: renderResponseMeta,
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
      previewArgs: ['request', 'filter'],
      onRender: renderBody,
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
      previewArgs: ['request', 'attribute', 'filter'],
      async onRender(ctx: Context, args: CallTemplateFunctionArgs): Promise<string | null> {
        if (!stringArg(args, 'request')) return null;

        // Delegate by name rather than by array index, so reordering the
        // template functions above can't silently rewire this.
        switch (stringArg(args, 'attribute') ?? 'body') {
          case 'oauth2':
            return renderOAuth2(ctx, args);
          case 'response':
            return renderResponseMeta(ctx, args);
          case 'body':
            return renderBody(ctx, args);
          default:
            return null;
        }
      },
    },
  ],
};
