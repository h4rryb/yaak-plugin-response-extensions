
//#region src/index.ts
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
function applyJSONPath(data, path) {
	if (!path || path === "$") return data;
	const parts = path.replace(/^\$\.?/, "").split(".");
	let result = data;
	for (const part of parts) {
		if (!part) continue;
		const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
		if (arrayMatch) {
			const [, fieldName, index] = arrayMatch;
			result = result?.[fieldName]?.[parseInt(index, 10)];
		} else result = result?.[part];
		if (result === void 0 || result === null) return null;
	}
	return result;
}
/** Render a JSONPath result as the string Yaak will substitute into the template. */
function renderResult(result) {
	if (result === null || result === void 0) return null;
	return typeof result === "object" ? JSON.stringify(result) : String(result);
}
/** Case-insensitive response header lookup. */
function headerValue(headers, name) {
	const wanted = name.toLowerCase();
	for (const header of headers ?? []) if (header.name?.toLowerCase() === wanted) return header.value;
	return null;
}
/** Read a template arg as a string, treating empty/absent as undefined. */
function stringArg(args, name) {
	const value = args.values[name];
	if (value === null || value === void 0 || value === "") return void 0;
	return String(value);
}
/**
* Get the appropriate response for a request based on behavior and purpose.
*/
async function resolveResponse(ctx, options) {
	const { requestId, purpose, behavior } = options;
	if (!requestId) return null;
	const httpRequest = await ctx.httpRequest.getById({ id: requestId });
	if (httpRequest == null) return null;
	const existing = await ctx.httpResponse.find({
		requestId: httpRequest.id,
		limit: 1
	});
	if (behavior === "always" || behavior === "smart" && purpose === "send" && existing.length === 0) try {
		const sent = await ctx.httpRequest.send({ httpRequest });
		return {
			httpResponse: sent.httpResponse,
			body: async () => sent.body
		};
	} catch (err) {
		console.error("[response-extensions] Failed to send request:", err);
		return null;
	}
	const httpResponse = existing[0];
	if (httpResponse == null) return null;
	return {
		httpResponse,
		body: async () => ctx.httpResponse.body({ responseId: httpResponse.id })
	};
}
const requestArg = {
	type: "http_request",
	name: "request",
	label: "Source Request"
};
const behaviorArg = {
	type: "select",
	name: "behavior",
	label: "Sending Behavior",
	defaultValue: "smart",
	options: [
		{
			label: "When no responses",
			value: "smart"
		},
		{
			label: "Always",
			value: "always"
		},
		{
			label: "Never",
			value: "never"
		}
	]
};
/**
* Extract OAuth2 token details from a request's authentication config.
*/
async function renderOAuth2(ctx, args) {
	const requestId = stringArg(args, "request");
	if (!requestId) return null;
	try {
		const httpRequest = await ctx.httpRequest.getById({ id: requestId });
		if (!httpRequest) return null;
		if (httpRequest.authenticationType !== "oauth2") {
			console.error("[response-extensions] Request does not have OAuth2 authentication configured");
			return null;
		}
		const auth = httpRequest.authentication ?? {};
		return renderResult(applyJSONPath({
			type: "OAuth2Token",
			parentId: httpRequest.id,
			modified: httpRequest.updatedAt,
			created: httpRequest.createdAt,
			accessToken: auth.accessToken ?? null,
			refreshToken: auth.refreshToken ?? null,
			identityToken: auth.identityToken ?? null,
			expiresAt: auth.expiresAt ?? null,
			error: auth.error ?? null,
			errorDescription: auth.errorDescription ?? null,
			errorUri: auth.errorUri ?? null
		}, stringArg(args, "filter") ?? "$.accessToken"));
	} catch (error) {
		console.error("[response-extensions] Error extracting OAuth2 data:", error);
		return null;
	}
}
/**
* Extract extended response metadata.
*/
async function renderResponseMeta(ctx, args) {
	const requestId = stringArg(args, "request");
	if (!requestId) return null;
	try {
		const resolved = await resolveResponse(ctx, {
			requestId,
			purpose: args.purpose,
			behavior: stringArg(args, "behavior") ?? "smart"
		});
		if (resolved == null) return null;
		const response = resolved.httpResponse;
		return renderResult(applyJSONPath({
			_id: response.id,
			type: "Response",
			parentId: response.requestId,
			modified: response.updatedAt,
			created: response.createdAt,
			statusCode: response.status,
			statusMessage: response.statusReason ?? "",
			contentType: headerValue(response.headers, "content-type") ?? "",
			url: response.url ?? "",
			headers: response.headers ?? [],
			elapsedTime: response.elapsed ?? 0,
			bytesRead: response.contentLength ?? 0,
			remoteAddr: response.remoteAddr ?? null,
			httpVersion: response.version ?? null,
			state: response.state,
			error: response.error ?? null
		}, stringArg(args, "filter") ?? "$.statusCode"));
	} catch (error) {
		console.error("[response-extensions] Error extracting response data:", error);
		return null;
	}
}
/**
* Extract data from a response body using JSONPath.
*/
async function renderBody(ctx, args) {
	const requestId = stringArg(args, "request");
	if (!requestId) return null;
	try {
		const resolved = await resolveResponse(ctx, {
			requestId,
			purpose: args.purpose,
			behavior: stringArg(args, "behavior") ?? "smart"
		});
		if (resolved == null) return null;
		if (resolved.httpResponse.error) {
			console.error("[response-extensions] Source request failed:", resolved.httpResponse.error);
			return null;
		}
		const filter = stringArg(args, "filter") ?? "$";
		let text;
		try {
			text = await (await resolved.body()).text();
		} catch (err) {
			console.error("[response-extensions] Failed to read response body:", err);
			return null;
		}
		let bodyData;
		try {
			bodyData = JSON.parse(text);
		} catch (err) {
			if (filter === "$") return text;
			console.error("[response-extensions] Response body is not JSON:", err);
			return null;
		}
		return renderResult(applyJSONPath(bodyData, filter));
	} catch (error) {
		console.error("[response-extensions] Error extracting body data:", error);
		return null;
	}
}
const plugin = { templateFunctions: [
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
		previewArgs: ["request", "filter"],
		onRender: renderOAuth2
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
		previewArgs: ["request", "filter"],
		onRender: renderResponseMeta
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
		previewArgs: ["request", "filter"],
		onRender: renderBody
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
					{
						label: "Response Body",
						value: "body"
					},
					{
						label: "OAuth2 Token",
						value: "oauth2"
					},
					{
						label: "Response Metadata",
						value: "response"
					}
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
		previewArgs: [
			"request",
			"attribute",
			"filter"
		],
		async onRender(ctx, args) {
			if (!stringArg(args, "request")) return null;
			switch (stringArg(args, "attribute") ?? "body") {
				case "oauth2": return renderOAuth2(ctx, args);
				case "response": return renderResponseMeta(ctx, args);
				case "body": return renderBody(ctx, args);
				default: return null;
			}
		}
	}
] };

//#endregion
exports.plugin = plugin;