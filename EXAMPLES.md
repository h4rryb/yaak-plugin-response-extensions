# Examples

## Example 1: OAuth2 Access Token in Environment Variable

**Scenario:** You want to use the same OAuth2 token across multiple requests.

### Step 1: Create an Auth Request

Create a request named `__auth` and configure it with OAuth2 authentication:
- Grant Type: Client Credentials (or your preferred type)
- Access Token URL: `https://auth.example.com/oauth/token`
- Client ID: `your-client-id`
- Client Secret: `your-client-secret`

### Step 2: Set Up Environment Variable

In your environment (Base Environment or folder-specific):

```json
{
  "access_token": "${[ responseExtensions.oauth2(__auth, '$.accessToken') ]}"
}
```

### Step 3: Use in Requests

In any request within that environment:

**Headers:**
```
Authorization: Bearer ${[ access_token ]}
```

---

## Example 2: Using OAuth2 Refresh Token

**Environment Variable:**
```json
{
  "access_token": "${[ responseExtensions.oauth2(__auth, '$.accessToken') ]}",
  "refresh_token": "${[ responseExtensions.oauth2(__auth, '$.refreshToken') ]}"
}
```

**Usage in a refresh request:**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "${[ refresh_token ]}"
}
```

---

## Example 3: Multi-Service Authentication

**Folder Structure:**
```
My API Collection/
├── Service A/
│   ├── __auth_service_a
│   ├── Get Users (Service A)
│   └── Create User (Service A)
├── Service B/
│   ├── __auth_service_b
│   ├── Get Products (Service B)
│   └── Create Product (Service B)
```

**Service A Folder Environment:**
```json
{
  "service_a_token": "${[ responseExtensions.oauth2(__auth_service_a, '$.accessToken') ]}"
}
```

**Service B Folder Environment:**
```json
{
  "service_b_token": "${[ responseExtensions.oauth2(__auth_service_b, '$.accessToken') ]}"
}
```

---

## Example 4: Extracting Response Status Code

**Use Case:** Check the status of a previous request before proceeding.

**Request Body:**
```json
{
  "previous_request_status": "${[ responseExtensions.response(create_user_request, '$.statusCode') ]}",
  "request_time": "${[ responseExtensions.response(create_user_request, '$.elapsedTime') ]}",
  "message": "Previous request ${[ responseExtensions.response(create_user_request, '$.statusCode') == 200 ? 'succeeded' : 'failed' ]}"
}
```

---

## Example 5: Extracting Response Headers

**Get a specific header value:**

```
X-Request-ID: ${[ responseExtensions.response(api_request, '$.headers[?(@.name=="X-Request-ID")].value') ]}
```

**Get Content-Type:**
```
${[ responseExtensions.response(api_request, '$.contentType') ]}
```

---

## Example 6: Check OAuth2 Token Expiration

**Environment Variable:**
```json
{
  "token_expires_at": "${[ responseExtensions.oauth2(__auth, '$.expiresAt') ]}",
  "access_token": "${[ responseExtensions.oauth2(__auth, '$.accessToken') ]}"
}
```

**Usage:**
You can then check `${[ token_expires_at ]}` to see when your token will expire.

---

## Example 7: Debugging OAuth2 Errors

**Environment Variable:**
```json
{
  "auth_error": "${[ responseExtensions.oauth2(__auth, '$.error') ]}",
  "auth_error_description": "${[ responseExtensions.oauth2(__auth, '$.errorDescription') ]}"
}
```

**Usage in a request (for debugging):**
```json
{
  "debug_info": {
    "error": "${[ auth_error ]}",
    "description": "${[ auth_error_description ]}"
  }
}
```

---

## Example 8: Complex JSONPath Queries

**Get all response headers:**
```json
{
  "all_headers": "${[ responseExtensions.response(api_request, '$.headers') ]}"
}
```

**Get multiple OAuth2 fields:**
```json
{
  "oauth_info": "${[ responseExtensions.oauth2(__auth, '$') ]}"
}
```

This will return the entire OAuth2 object as JSON.

---

## Example 9: Dynamic Request URLs

**Use response metadata in subsequent requests:**

```
https://api.example.com/callback?previous_status=${[ responseExtensions.response(create_request, '$.statusCode') ]}&time=${[ responseExtensions.response(create_request, '$.elapsedTime') ]}
```

---

## Example 10: Conditional Authentication

**Base Environment:**
```json
{
  "use_service_a": true,
  "auth_token": "${[ use_service_a ? responseExtensions.oauth2(__auth_service_a, '$.accessToken') : responseExtensions.oauth2(__auth_service_b, '$.accessToken') ]}"
}
```

---

## Example 11: JWT Identity Token

Some OAuth2 providers return an identity token (JWT):

**Environment Variable:**
```json
{
  "id_token": "${[ responseExtensions.oauth2(__auth, '$.identityToken') ]}"
}
```

**Usage:**
```
Authorization: Bearer ${[ id_token ]}
```

---

## Tips

1. **Always execute the source request first**: The plugin needs the request to have been executed at least once to access its OAuth2 or response data.

2. **Use descriptive names**: Name your auth requests clearly (e.g., `__auth`, `__auth_service_a`) to make them easy to reference.

3. **Test your JSONPath**: Use `$` as the filter first to see all available data, then narrow down to the specific field you need.

4. **Folder-level variables**: Set up authentication at the folder level for better organization when working with multiple services.

5. **Environment inheritance**: Remember that environment variables inherit from parent to child, so you can set up common tokens in a base environment and override them in sub-environments if needed.
