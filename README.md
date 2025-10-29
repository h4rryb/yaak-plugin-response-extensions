# Yaak Response Extensions Plugin

A Yaak plugin that provides access to extended response attributes, including OAuth2 tokens and response metadata. This plugin replicates the functionality of the popular Insomnia `insomnia-plugin-response-extensions`.

## Features

- **OAuth2 Token Access**: Extract OAuth2 tokens (access tokens, refresh tokens, etc.) from other requests
- **Response Metadata**: Access detailed response information (status code, headers, content type, etc.)
- **JSONPath Filtering**: Use JSONPath expressions to extract specific values
- **Request Chaining**: Easily reference authentication tokens across multiple requests

## Installation

### Via Yaak Plugin Directory (Recommended)

1. Open Yaak
2. Go to `Settings` → `Plugins`
3. Search for "Response Extensions"
4. Click `Install`

### Manual Installation

1. Install the Yaak CLI:
   ```bash
   npm install -g @yaakapp/cli
   ```

2. Clone or download this plugin
3. Install dependencies:
   ```bash
   cd yaak-response-extensions-plugin
   npm install
   ```

4. Build the plugin:
   ```bash
   npm run build
   ```

5. Install the plugin in Yaak:
   - Open Yaak → Settings → Plugins
   - Click "Install from folder"
   - Select the plugin directory

## Usage

This plugin provides four template functions that you can use in any text field in Yaak:

### 1. `responseExtensions.oauth2`

Extract OAuth2 token details from a request with OAuth2 authentication configured.

**Syntax:**
```
${[ responseExtensions.oauth2(request, filter) ]}
```

**Example - Extract Access Token:**
```json
{
  "Authorization": "Bearer ${[ responseExtensions.oauth2(auth_request, '$.accessToken') ]}"
}
```

**Available OAuth2 Fields:**
- `$.accessToken` - The OAuth2 access token
- `$.refreshToken` - The OAuth2 refresh token
- `$.identityToken` - The identity token (if available)
- `$.expiresAt` - Token expiration timestamp
- `$.error` - Error message (if authentication failed)
- `$.errorDescription` - Detailed error description
- `$` - Full OAuth2 object

### 2. `responseExtensions.response`

Extract response metadata from a previous request.

**Syntax:**
```
${[ responseExtensions.response(request, filter) ]}
```

**Example - Extract Status Code:**
```
Status: ${[ responseExtensions.response(api_request, '$.statusCode') ]}
```

**Available Response Fields:**
- `$.statusCode` - HTTP status code (e.g., 200, 404)
- `$.statusMessage` - Status message (e.g., "OK", "Not Found")
- `$.contentType` - Response content type
- `$.url` - The request URL
- `$.headers` - Array of response headers
- `$.elapsedTime` - Request duration in milliseconds
- `$.bytesRead` - Response size in bytes
- `$` - Full response metadata object

### 3. `responseExtensions.body`

Extract data from the response body using JSONPath.

**Syntax:**
```
${[ responseExtensions.body(request, filter, behavior) ]}
```

**Example - Extract Token from Response Body:**
```json
{
  "Authorization": "Bearer ${[ responseExtensions.body(login_request, '$.access_token') ]}"
}
```

**Example - Extract Nested Data:**
```
User ID: ${[ responseExtensions.body(api_request, '$.data.user.id') ]}
```

**Available Parameters:**
- `request` - The request whose response body you want to extract from
- `filter` - JSONPath to extract specific data (default: `$` for entire body)
- `behavior` - When to send the request (default: "When no responses")
  - "When no responses" - Only send if no cached response exists
  - "Always" - Send the request every time
  - "Never" - Never send, only use cached response

### 4. `responseExtensions` (Generic)

A generic function that accepts an attribute type parameter.

**Syntax:**
```
${[ responseExtensions(request, attribute_type, filter, behavior) ]}
```

**Attribute Types:**
- `'body'` - Extract from response body (default)
- `'oauth2'` - Extract OAuth2 token data
- `'response'` - Extract response metadata

**Example:**
```json
{
  "Body Token": "${[ responseExtensions(api_request, 'body', '$.token') ]}",
  "OAuth Token": "${[ responseExtensions(oauth_request, 'oauth2', '$.accessToken') ]}",
  "Status": "${[ responseExtensions(api_request, 'response', '$.statusCode') ]}"
}
```

## Common Use Cases

### Sending Behavior

All functions support a "behavior" parameter that controls when the source request is sent:

- **"When no responses" (smart)** - Default. Only sends the request if there's no cached response. Perfect for auth tokens that persist across sessions.
- **"Always"** - Sends the request every time the template is rendered. Useful for real-time data or tokens that expire quickly.
- **"Never"** - Never sends the request, only uses cached responses. Good for viewing historical data.

**Example:**
```json
{
  "token": "${[ responseExtensions.oauth2(auth, '$.accessToken', 'smart') ]}"
}
```

### 1. OAuth2 Authentication Flow

Set up a centralized OAuth2 authentication:

**Step 1:** Create an authentication request with OAuth2 configured
- Name it something like `__auth` or `get_token`
- Configure OAuth2 settings (client credentials, etc.)

**Step 2:** Create an environment variable:
```json
{
  "access_token": "${[ responseExtensions.oauth2(__auth, '$.accessToken') ]}"
}
```

**Step 3:** Use the token in your API requests:
```
Authorization: Bearer ${[ access_token ]}
```

### 2. Extract Token from Response Body

Get an authentication token directly from a login response:

**Step 1:** Create a login request (e.g., POST to `/auth/login`)

**Step 2:** Extract token from response body:
```json
{
  "api_token": "${[ responseExtensions.body(login_request, '$.access_token') ]}"
}
```

**Step 3:** Use in subsequent requests:
```
Authorization: Bearer ${[ api_token ]}
```

This works for any API that returns tokens in the response body, like:
```json
{
  "success": true,
  "access_token": "abc123xyz",
  "expires_in": 3600
}
```

### 3. Request Chaining with Response Metadata

Check if a request succeeded before proceeding:
```json
{
  "previous_status": "${[ responseExtensions.response(previous_request, '$.statusCode') ]}",
  "previous_url": "${[ responseExtensions.response(previous_request, '$.url') ]}"
}
```

### 4. Extract Specific Headers

Get a specific response header value:
```
${[ responseExtensions.response(api_request, '$.headers[?(@.name=="X-Request-ID")].value') ]}
```

## Folder-Level Configuration

You can define authentication at the folder level for better organization:

```
Collection/
├── Folder A/
│   ├── __auth (OAuth2 configured here)
│   ├── Request 1 (uses Folder A's token)
│   └── Request 2 (uses Folder A's token)
└── Folder B/
    ├── __auth (Different OAuth2 config)
    ├── Request 3 (uses Folder B's token)
    └── Request 4 (uses Folder B's token)
```

## JSONPath Examples

The plugin includes a built-in JSONPath implementation that supports common query patterns:

**Supported Patterns:**
- `$` - Root object (returns everything)
- `$.field` - Access a specific field
- `$.nested.field` - Access nested fields
- `$.array[0]` - First element of an array
- `$.nested.array[5]` - Nested array access

**Examples:**

**Supported Patterns:**
- `$` - Root object (returns everything)
- `$.field` - Access a specific field
- `$.nested.field` - Access nested fields
- `$.array[0]` - First element of an array
- `$.nested.array[5]` - Nested array access

**Examples:**
```
$.accessToken          → "abc123..."
$.statusCode           → 200
$.headers[0]           → First header object
$.oauth2Data.expiresAt → 1698765432
$                      → Entire object as JSON
```

**Note:** The plugin uses a lightweight built-in JSONPath parser. For complex queries with filters (e.g., `$.headers[?(@.name=="X-ID")]`), consider using Yaak's built-in response functions or preprocessing the data.

## Troubleshooting

### No OAuth2 data returned
- Ensure the source request has OAuth2 authentication configured
- Verify the request has been executed at least once
- Check that the JSONPath filter is correct

### Response metadata not found
- Make sure the source request has been executed
- Verify the request ID is correct
- Check the JSONPath filter syntax

### Empty or null values
- The field you're accessing might not exist
- Try using `$` as the filter to see all available data
- Check the console for error messages

## Comparison with Insomnia Plugin

This plugin provides equivalent functionality to `insomnia-plugin-response-extensions`:

| Insomnia | Yaak |
|----------|------|
| `{% responseExtensions 'req_id', 'oauth2', '$.accessToken' %}` | `${[ responseExtensions.oauth2(req_id, '$.accessToken') ]}` |
| `{% responseExtensions 'req_id', 'response', '$.statusCode' %}` | `${[ responseExtensions.response(req_id, '$.statusCode') ]}` |

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

This will watch for changes and automatically rebuild the plugin.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - See LICENSE file for details

## Credits

Inspired by the [insomnia-plugin-response-extensions](https://github.com/vajsm/insomnia-plugin-response-extensions) by vajsm.

## Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Refer to the [Yaak Plugin Documentation](https://yaak.app/documentation)
