"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  plugin: () => plugin
});
module.exports = __toCommonJS(src_exports);
var import_node_fs = require("node:fs");
function applyJSONPath(data, path) {
  if (!path || path === "$") {
    return data;
  }
  const parts = path.replace(/^\$\.?/, "").split(".");
  let result = data;
  for (const part of parts) {
    if (!part) continue;
    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, fieldName, index] = arrayMatch;
      result = result?.[fieldName]?.[parseInt(index)];
    } else {
      result = result?.[part];
    }
    if (result === void 0 || result === null) {
      return null;
    }
  }
  return result;
}
async function getResponse(ctx, options) {
  const { requestId, purpose, behavior } = options;
  if (!requestId) return null;
  const httpRequest = await ctx.httpRequest.getById({ id: requestId });
  if (httpRequest == null) {
    return null;
  }
  const responses = await ctx.httpResponse.find({ requestId: httpRequest.id });
  const shouldSend = behavior === "always" || behavior === "smart" && purpose === "send" && responses.length === 0;
  if (shouldSend) {
    try {
      await ctx.httpRequest.send({ id: httpRequest.id });
      const newResponses = await ctx.httpResponse.find({ requestId: httpRequest.id });
      return newResponses[0] ?? null;
    } catch (err) {
      console.error("Failed to send request:", err);
      return null;
    }
  }
  return responses[0] ?? null;
}
var requestArg = {
  type: "http_request",
  name: "request",
  label: "Source Request"
};
var behaviorArg = {
  type: "select",
  name: "behavior",
  label: "Sending Behavior",
  defaultValue: "smart",
  options: [
    { label: "When no responses", value: "smart" },
    { label: "Always", value: "always" },
    { label: "Never", value: "never" }
  ]
};
var plugin = {
  templateFunctions: [
    {
      name: "responseExtensions.oauth2",
      description: "Extract OAuth2 token details from a request (accessToken, refreshToken, etc.)",
      args: [
        requestArg,
        {
          type: "text",
          name: "filter",
          label: "JSONPath Filter",
          placeholder: "$.accessToken",
          defaultValue: "$.accessToken"
        },
        behaviorArg
      ],
      async onRender(ctx, args) {
        if (!args.values.request) return null;
        try {
          const httpRequest = await ctx.httpRequest.getById({ id: args.values.request });
          if (!httpRequest) return null;
          const auth = httpRequest.authentication;
          if (!auth || auth.type !== "oauth2") {
            console.error("Request does not have OAuth2 authentication configured");
            return null;
          }
          const oauth2Data = {
            type: "OAuth2Token",
            parentId: httpRequest.id,
            modified: httpRequest.updatedAt,
            created: httpRequest.createdAt,
            accessToken: auth.accessToken || null,
            refreshToken: auth.refreshToken || null,
            identityToken: auth.identityToken || null,
            expiresAt: auth.expiresAt || null,
            error: auth.error || null,
            errorDescription: auth.errorDescription || null,
            errorUri: auth.errorUri || null
          };
          const filter = args.values.filter || "$.accessToken";
          const result = applyJSONPath(oauth2Data, filter);
          if (result !== null && result !== void 0) {
            if (typeof result === "object") {
              return JSON.stringify(result);
            }
            return String(result);
          }
          return null;
        } catch (error) {
          console.error("Error extracting OAuth2 data:", error);
          return null;
        }
      }
    },
    {
      name: "responseExtensions.response",
      description: "Extract extended response metadata (statusCode, headers, contentType, etc.)",
      args: [
        requestArg,
        {
          type: "text",
          name: "filter",
          label: "JSONPath Filter",
          placeholder: "$.statusCode",
          defaultValue: "$.statusCode"
        },
        behaviorArg
      ],
      async onRender(ctx, args) {
        if (!args.values.request) return null;
        try {
          const response = await getResponse(ctx, {
            requestId: args.values.request,
            purpose: args.purpose,
            behavior: args.values.behavior ?? "smart"
          });
          if (response == null) return null;
          const responseData = {
            _id: response.id,
            type: "Response",
            parentId: response.requestId,
            modified: response.updatedAt,
            created: response.createdAt,
            statusCode: response.status,
            statusMessage: response.statusText || "",
            contentType: response.contentType || "",
            url: response.url || "",
            headers: response.headers || [],
            elapsedTime: response.elapsed || 0,
            bytesRead: response.size || 0
          };
          const filter = args.values.filter || "$.statusCode";
          const result = applyJSONPath(responseData, filter);
          if (result !== null && result !== void 0) {
            if (typeof result === "object") {
              return JSON.stringify(result);
            }
            return String(result);
          }
          return null;
        } catch (error) {
          console.error("Error extracting response data:", error);
          return null;
        }
      }
    },
    {
      name: "responseExtensions.body",
      description: "Extract data from response body using JSONPath",
      args: [
        requestArg,
        {
          type: "text",
          name: "filter",
          label: "JSONPath Filter",
          placeholder: "$.token",
          defaultValue: "$"
        },
        behaviorArg
      ],
      async onRender(ctx, args) {
        if (!args.values.request) return null;
        try {
          const response = await getResponse(ctx, {
            requestId: args.values.request,
            purpose: args.purpose,
            behavior: args.values.behavior ?? "smart"
          });
          if (response == null || response.bodyPath == null) return null;
          let body;
          try {
            body = (0, import_node_fs.readFileSync)(response.bodyPath, "utf-8");
          } catch (err) {
            console.error("Failed to read response body:", err);
            return null;
          }
          let bodyData;
          try {
            bodyData = JSON.parse(body);
          } catch (err) {
            if (args.values.filter === "$" || !args.values.filter) {
              return body;
            }
            console.error("Response body is not JSON:", err);
            return null;
          }
          const filter = args.values.filter || "$";
          const result = applyJSONPath(bodyData, filter);
          if (result !== null && result !== void 0) {
            if (typeof result === "object") {
              return JSON.stringify(result);
            }
            return String(result);
          }
          return null;
        } catch (error) {
          console.error("Error extracting body data:", error);
          return null;
        }
      }
    },
    {
      name: "responseExtensions",
      description: "Generic response extensions - access OAuth2, response metadata, or body",
      args: [
        requestArg,
        {
          type: "select",
          name: "attribute",
          label: "Attribute Type",
          defaultValue: "body",
          options: [
            { label: "Response Body", value: "body" },
            { label: "OAuth2 Token", value: "oauth2" },
            { label: "Response Metadata", value: "response" }
          ]
        },
        {
          type: "text",
          name: "filter",
          label: "JSONPath Filter",
          placeholder: "$.token",
          defaultValue: "$"
        },
        behaviorArg
      ],
      async onRender(ctx, args) {
        if (!args.values.request) return null;
        const attribute = args.values.attribute || "body";
        if (attribute === "oauth2") {
          return plugin.templateFunctions[0].onRender(ctx, args);
        } else if (attribute === "response") {
          return plugin.templateFunctions[1].onRender(ctx, args);
        } else if (attribute === "body") {
          return plugin.templateFunctions[2].onRender(ctx, args);
        }
        return null;
      }
    }
  ]
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  plugin
});
