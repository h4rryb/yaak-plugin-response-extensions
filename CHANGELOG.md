# Release Notes & Changelog

## Version 0.2.0 - Latest Yaak Compatibility (Experimental)

### 🔄 Compatibility Updates

#### Updated Dependencies
- ✅ Updated `@yaakapp/api` from `^0.6.4` to `^0.8.3`
- ✅ Ensures compatibility with Yaak 2026.3.1 and earlier versions
- ✅ Backward compatible with Yaak 2025.x versions

#### Preview Args Support
- ✅ Added `previewArgs` to all template functions
- ✅ Better context display in template tags
- ✅ Shows request name and filter in preview

### 🐛 Fixes
- Fixed compatibility with Yaak 2026.x series
- Resolved type errors with newer API versions
- Improved preview display for all functions

### 📝 Technical Details
- No breaking changes from 0.1.0
- No new features (compatibility update only)
- All existing functionality works the same

### ⚠️ Experimental Notice
This plugin uses Yaak's experimental plugin API. While stable, the API may change in future Yaak versions. Using 0.x versioning to reflect this experimental status.

### Migration
No code changes needed! Just:
```bash
npm install
npm run build
```
Then reload in Yaak.

---

## Version 0.1.0 - Body Extraction & Behavior Control (Experimental)

### 🎉 New Features

#### Response Body Extraction
- ✅ New `responseExtensions.body()` function
- ✅ Extract tokens and data from response bodies
- ✅ Supports JSON and plain text responses
- ✅ Perfect for login endpoints that return tokens

#### Sending Behavior Control
- ✅ Added behavior parameter to all functions
- ✅ Three modes: "smart", "always", "never"
- ✅ Control when requests are automatically sent
- ✅ Prevents unnecessary requests with smart mode

#### Better Defaults
- ✅ OAuth2 defaults to `$.accessToken`
- ✅ Body defaults to `$` (entire response)
- ✅ Response defaults to `$.statusCode`
- ✅ All functions default to "smart" behavior

#### Preview Support
- ✅ Fixed blank preview issue
- ✅ Now shows actual extracted values
- ✅ Better debugging experience

### 🔧 Technical Improvements
- Added `getResponse()` helper function for behavior logic
- Added `readFileSync` for reading response bodies
- Improved error handling and logging
- Better TypeScript types for all parameters

### 📝 Documentation
- Updated README with new features
- Added body extraction examples
- Added behavior documentation
- Updated EXAMPLES.md with 12 examples

### Migration
- ✅ No breaking changes from 0.0.1
- ✅ Backward compatible
- ✅ Existing code works without modifications

---

## Version 0.0.1 - Initial Release (Experimental)

### Features

#### Core Functionality
- ✅ OAuth2 token extraction from configured requests
- ✅ Response metadata extraction (status, headers, timing, etc.)
- ✅ Built-in JSONPath filtering for precise data extraction
- ✅ Three template functions for different use cases
- ✅ Zero external dependencies (except @yaakapp/api)

#### Template Functions

1. **responseExtensions.oauth2**
   - Extract OAuth2 authentication data
   - Supports: accessToken, refreshToken, identityToken, expiresAt, error details
   - Full JSONPath support for filtering

2. **responseExtensions.response**
   - Extract response metadata
   - Supports: statusCode, statusMessage, headers, contentType, url, elapsedTime, bytesRead
   - Full JSONPath support for filtering

3. **responseExtensions** (Generic)
   - Unified interface with attribute type selector
   - Choose between 'oauth2' or 'response' mode
   - Delegates to specialized functions

#### Developer Experience
- TypeScript for type safety
- Comprehensive documentation
- 11 detailed examples
- Quick installation guide
- Troubleshooting guide included

### Known Limitations

1. **OAuth2 Only**
   - Currently only supports OAuth2 authentication type
   - Other auth types (Basic, Bearer, etc.) use built-in Yaak functions

2. **Request Must Be Executed**
   - The source request must be executed at least once
   - No data available for requests that haven't been sent

3. **Most Recent Response Only**
   - Always uses the most recent response from a request
   - No access to response history

4. **No Response Body Access**
   - Only metadata is accessible, not response body
   - Use Yaak's built-in `response.body.path` for body extraction

### Technical Notes

#### Dependencies
- `@yaakapp/api`: ^0.6.4
- Built-in JSONPath parser (no external dependencies)
- TypeScript: ^5.5.2
- Node.js: 18+ recommended

#### JSONPath Implementation
The plugin uses a lightweight built-in JSONPath parser instead of external libraries. Supported patterns:
- `$` - Root object
- `$.field` - Field access
- `$.nested.field` - Nested fields
- `$.array[0]` - Array indexing

This keeps the plugin lightweight and eliminates bundling issues.

#### Compatibility
- Yaak: v2024.8.0 and later
- Works on macOS, Windows, and Linux
- No external service dependencies

### Migration from Insomnia

If you're migrating from Insomnia's `insomnia-plugin-response-extensions`:

#### Syntax Changes
```
Insomnia:
{% responseExtensions 'req_abc123', 'oauth2', '$.accessToken' %}

Yaak:
${[ responseExtensions.oauth2(req_abc123, '$.accessToken') ]}
```

#### Function Mapping
- `responseExtensions(..., 'oauth2', ...)` → `responseExtensions.oauth2(...)`
- `responseExtensions(..., 'response', ...)` → `responseExtensions.response(...)`

#### Request IDs
- Insomnia uses string IDs like `'req_abc123'`
- Yaak uses request selectors (select from dropdown in template function)

### Future Enhancements (Planned)

#### v1.1.0 (Potential)
- [ ] Support for additional authentication types
- [ ] Access to response history (not just latest)
- [ ] Conditional rendering based on response status
- [ ] Custom error messages for failed requests

#### v1.2.0 (Potential)
- [ ] Response body caching for faster access
- [ ] Multiple response aggregation
- [ ] Token auto-refresh detection
- [ ] Response comparison functions

#### v2.0.0 (Future)
- [ ] UI components for token management
- [ ] Request hooks for automatic token injection
- [ ] Token expiration warnings
- [ ] Multi-token management

### Breaking Changes

None - Initial release.

### Bug Fixes

None - Initial release.

### Documentation

- Added comprehensive README.md
- Added INSTALL.md with step-by-step instructions
- Added EXAMPLES.md with 11 real-world examples
- Added inline code documentation
- Added troubleshooting guide

### Testing

Tested on:
- ✅ macOS (development environment)
- ⚠️ Windows (needs community testing)
- ⚠️ Linux (needs community testing)

### Community Contributions

This is the initial release. Contributions welcome!

#### How to Contribute
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

#### Areas Needing Help
- Windows testing
- Linux testing
- Additional examples
- Documentation improvements
- Bug reports and fixes

### Acknowledgments

- Thanks to vajsm for the original Insomnia plugin inspiration
- Thanks to the Yaak team for the excellent plugin API
- Thanks to the Yaak community for feedback and support

### Resources

- [Yaak Documentation](https://yaak.app/documentation)
- [Yaak Plugin API](https://github.com/yaakapp/plugins)
- [JSONPath Plus](https://github.com/JSONPath-Plus/JSONPath)
- [Original Insomnia Plugin](https://github.com/vajsm/insomnia-plugin-response-extensions)

---

## Installation Statistics

Available after publishing to npm registry.

## Download

- [GitHub Releases](https://github.com/yourusername/yaak-response-extensions/releases)
- [NPM Package](https://www.npmjs.com/package/@yaak/response-extensions) (when published)

---

**Last Updated**: 2025-10-29
**Status**: Stable Release
**License**: MIT
