# Version 1.2.0 - Latest Yaak Compatibility Update

## 🔄 Compatibility Fix for Latest Yaak Versions

This update ensures the plugin works with the latest Yaak versions (2025.9.0+).

## What Changed

### 1. Updated @yaakapp/api Dependency
**Before:** `^0.6.4`  
**After:** `^0.8.3` (latest)

This brings compatibility with Yaak versions:
- ✅ 2025.9.0 and later
- ✅ 2025.8.0
- ✅ 2025.7.0
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

- ✅ Yaak 2025.9.3 (latest as of Dec 2025)
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

### From v1.1.0 to v1.2.0

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

**v1.2.0 (Latest)**
- Updated `@yaakapp/api` to `^0.8.3`
- Added `previewArgs` to all template functions
- Ensured compatibility with Yaak 2025.9.0+
- No breaking changes

**v1.1.0**
- Added response body extraction
- Added sending behavior control
- Fixed blank preview issue

**v1.0.0**
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
   - Should show "Response Extensions v1.2.0"

## What's Next

This plugin is now up to date with the latest Yaak API. Future updates will track Yaak's development and add new features as they become available.

---

**Updated:** December 2025  
**Plugin Version:** 1.2.0  
**Yaak Compatibility:** 2025.7.0+  
**API Version:** 0.8.3
