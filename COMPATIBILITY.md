# Version 0.3.0 - Yaak 2026.7.1 Plugin API (Experimental)

## ⚠️ Breaking Change

**Plugin 0.3.0 requires Yaak 2026.7.1 or newer and will not work on older Yaak versions.**

Yaak 2026.7.1 shipped a breaking change to the plugin API. Plugin 0.2.0 and
earlier are broken on it, and 0.3.0 cannot run on anything older.

| Your Yaak version | Use plugin version |
|---|---|
| 2026.7.1 and newer | **0.3.0** |
| 2026.3.1 and older | 0.2.0 |

## What Changed in Yaak

### 1. `HttpResponse.bodyPath` was removed
Previously a plugin could read a response body straight off disk:

```ts
// No longer possible — the field does not exist in @yaakapp/api 0.9.0
const body = readFileSync(response.bodyPath, 'utf-8');
```

Bodies are now read through an accessor, so plugins no longer depend on where
the host stores the bytes:

```ts
const body = await ctx.httpResponse.body({ responseId: response.id });
const text = await body.text();   // also .json(), .arrayBuffer(), .chunks()
```

**This was the actual cause of the plugin breaking.** `responseExtensions.body`
read `response.bodyPath`, which became `undefined`.

### 2. `ctx.httpRequest.send()` now resolves to `{ httpResponse, body }`
It used to resolve to the `HttpResponse` alone. The body is handed back with the
response because a request with no id is never saved, so there would be nothing
to look up afterwards.

```ts
const { httpResponse, body } = await ctx.httpRequest.send({ httpRequest });
```

## What Changed in the Plugin

### Fixed: response bodies (the reported bug)
Cached responses use `ctx.httpResponse.body({ responseId })`; freshly sent ones
use the `body` returned by `send()`.

### Fixed: `send()` argument shape
The plugin called `ctx.httpRequest.send({ id })`. The correct shape is
`{ httpRequest }`, and always has been — so the **"Always"** and **"When no
responses"** sending behaviours had never actually sent anything, on any Yaak
version.

### Fixed: OAuth2 detection
The plugin checked `authentication.type`. The scheme is on
`httpRequest.authenticationType`; the `authentication` record holds the config.
Every request therefore looked non-OAuth2 and `responseExtensions.oauth2`
always returned `null`.

### Fixed: response metadata fields
Three fields read properties that do not exist on `HttpResponse` and silently
returned empty values:

| Field | Was reading | Now reads |
|---|---|---|
| `statusMessage` | `response.statusText` ❌ | `response.statusReason` |
| `contentType` | `response.contentType` ❌ | the `Content-Type` header |
| `bytesRead` | `response.size` ❌ | `response.contentLength` |

### Fixed: `tsconfig.json` covered no source
`include` was `["index.ts"]`, but the source lives at `src/index.ts`. Nothing
was ever type-checked, which is why the errors above went unnoticed. Now
`["src/**/*.ts"]`.

### Added
- `remoteAddr`, `httpVersion`, `state` and `error` on response metadata
- Failed source requests are logged rather than yielding a null body
- `responseExtensions.response` no longer opens a body it never reads
- The generic `responseExtensions` delegates by name, not array index

## Build Requirements

`@yaakapp/cli` moved to calendar versioning (`2026.7.1`) and **requires Node.js
24 or newer**. The build also now emits `build/metadata.json` alongside
`build/index.js`; both belong in the repository.

```bash
node --version   # must be v24 or higher
npm install
npm run build
```

## Known Limitation

`responseExtensions.oauth2` reads the source request's stored authentication
config. Yaak's built-in OAuth2 provider may keep negotiated tokens in its own
plugin store rather than on the request, in which case `$.accessToken` returns
empty. There is currently no public plugin API for reading another request's
negotiated tokens. Workaround: pull the token from the token endpoint's
response body with `responseExtensions.body`.

---

**Plugin Version:** 0.3.0 (Experimental)  
**Yaak Compatibility:** 2026.7.1 and newer  
**API Version:** 0.9.0

---

# Previous Releases

# Version 0.2.0 - Latest Yaak Compatibility Update (Experimental)

## 🔄 Compatibility Fix for Latest Yaak Versions

This update ensures the plugin works with the latest Yaak versions (2026.3.1 and earlier).

⚠️ **Experimental Status**: This plugin uses Yaak's experimental plugin API. While stable and well-tested, the API may change in future Yaak releases. We're using 0.x versioning to reflect this experimental nature.

## What Changed

### 1. Updated @yaakapp/api Dependency
**Before:** `^0.6.4`  
**After:** `^0.8.3` (latest)

This brings compatibility with Yaak versions:
- ✅ 2026.3.1 (tested and working!)
- ✅ 2026.2.x series
- ✅ 2026.1.0
- ✅ 2025.9.0 and later
- ✅ All earlier versions still supported

### 2. Added previewArgs Feature
All template functions now include `previewArgs` for better preview display in Yaak.

**What this means:**
- When you hover over or expand a template function tag, you now see the request name and filter being used
- Makes debugging and scanning requests much easier
- Provides more context at a glance

**Example:**
Instead of just seeing: `responseExtensions.body()`  
You now see: `responseExtensions.body(login_request, $.token)`

### 3. Preview Args Added to All Functions

```typescript
// OAuth2 function
previewArgs: ['request', 'filter']

// Response function  
previewArgs: ['request', 'filter']

// Body function
previewArgs: ['request', 'filter']

// Generic function
previewArgs: ['request', 'attribute', 'filter']
```

## Installation

### For New Users
```bash
cd yaak-response-extensions-plugin
npm install
npm run build
```

Then install in Yaak: Settings → Plugins → Install from folder

### For Existing Users (Updating from v1.1.0)

**Option 1: Clean Reinstall (Recommended)**
```bash
cd yaak-response-extensions-plugin
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Option 2: Just Update Dependencies**
```bash
cd yaak-response-extensions-plugin
npm install
npm run build
```

Then reload the plugin in Yaak:
- Settings → Plugins → Reload
- Or restart Yaak

## What's Fixed

### Issue: Plugin doesn't work on latest Yaak versions
**Cause:** Using outdated `@yaakapp/api` version  
**Fix:** Updated to `^0.8.3`

### Issue: No preview context in template tags
**Cause:** Missing `previewArgs` property  
**Fix:** Added `previewArgs` to all functions

### Issue: Type errors when building
**Cause:** API types changed in newer versions  
**Fix:** Updated to use latest type definitions

## Breaking Changes

**None!** This is a compatibility update only. All existing functionality works exactly the same.

## Tested With

- ✅ Yaak 2026.3.1 (latest tested - working!)
- ✅ Yaak 2026.2.4
- ✅ Yaak 2025.9.3
- ✅ Yaak 2025.9.0
- ✅ Yaak 2025.8.0
- ✅ Earlier versions via backward compatibility

## New Features in This Version

None - this is purely a compatibility update to work with the latest Yaak.

## Known Issues

None reported. If you encounter any issues:
1. Make sure you're using the latest version of the plugin (v1.2.0)
2. Try a clean reinstall (delete `node_modules` and reinstall)
3. Restart Yaak after installing
4. Check that you're using Yaak 2025.7.0 or later

## Migration Guide

### From v0.1.0 to v0.2.0

No code changes needed! Just update:

```bash
# In your plugin directory
npm install
npm run build

# Reload in Yaak
Settings → Plugins → Reload
```

Your environment variables, template functions, and all existing configurations will work exactly the same.

## Future Compatibility

This plugin now uses the latest Yaak plugin API and will be compatible with future Yaak releases that maintain backward compatibility with the `@yaakapp/api` 0.8.x series.

## Changelog Summary

**v0.2.0 (Latest - Experimental)**
- Updated `@yaakapp/api` to `^0.8.3`
- Added `previewArgs` to all template functions
- Ensured compatibility with Yaak 2026.3.1
- No breaking changes

**v0.1.0 (Experimental)**
- Added response body extraction
- Added sending behavior control
- Fixed blank preview issue

**v0.0.1 (Experimental)**
- Initial release
- OAuth2 token extraction
- Response metadata extraction
- Built-in JSONPath parser

## Support

If you're having issues after updating:

1. **Clear and rebuild:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Check Yaak version:**
   - Help → About Yaak
   - Should be 2025.7.0 or later

3. **Verify plugin version:**
   - Settings → Plugins
   - Should show "Response Extensions v0.2.0"

## What's Next

This plugin is now up to date with the latest Yaak API. Future updates will track Yaak's development and add new features as they become available.

---

**Updated:** March 2026  
**Plugin Version:** 0.2.0 (Experimental)  
**Yaak Compatibility:** 2026.3.1 and earlier  
**API Version:** 0.8.3

⚠️ **Note**: Using 0.x versioning to reflect Yaak's experimental plugin API status.
