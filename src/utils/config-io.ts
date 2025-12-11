import fs from 'fs';
import path from 'path';
import { parse } from 'jsonc-parser';
import { LaunchParams } from '@utils/types/launchParams.type';
import { FUNCTION_PARAMS_TEMPLATE } from './types/functionParamsTemplate';

// File paths
const ROOT = process.cwd();
const LAUNCH_PARAMS_PATH = path.join(ROOT, 'launchParams.jsonc');
const FUNCTION_PARAMS_PATH = path.join(ROOT, 'functionParams.jsonc');

// JSON formatting
const JSON_INDENT = '\t';
const FILE_ENCODING = 'utf-8' as const;

/**
 * Reads and parses a JSONC file
 * @param filePath - Path to the JSONC file
 * @returns Parsed JSON object
 */
export function readJsonc(filePath: string): unknown {
	const raw = fs.readFileSync(filePath, FILE_ENCODING);
	return parse(raw);
}

/**
 * Reads both configuration files
 * @returns Object containing launchParams and functionParams
 */
export function readConfigs(): { launchParams: LaunchParams; functionParams: any } {
	const launchParams = fs.existsSync(LAUNCH_PARAMS_PATH)
		? (readJsonc(LAUNCH_PARAMS_PATH) as LaunchParams)
		: ({} as LaunchParams);
	const functionParams = fs.existsSync(FUNCTION_PARAMS_PATH) ? readJsonc(FUNCTION_PARAMS_PATH) : {};
	return { launchParams, functionParams };
}

/**
 * Writes both configuration files
 * Note: Comments in .jsonc files will be lost during serialization
 * @param launchParams - Launch parameters configuration
 * @param functionParams - Function parameters configuration
 */
export function writeConfigs(launchParams: unknown, functionParams: unknown): void {
	const serializedLaunch = JSON.stringify(launchParams, null, JSON_INDENT);
	const serializedFunction = JSON.stringify(functionParams, null, JSON_INDENT);

	fs.writeFileSync(LAUNCH_PARAMS_PATH, serializedLaunch, FILE_ENCODING);
	fs.writeFileSync(FUNCTION_PARAMS_PATH, serializedFunction, FILE_ENCODING);
}

/**
 * Result of a deep merge operation
 */
interface MergeResult {
	merged: unknown;
	hasChanges: boolean;
}

/**
 * Creates a deep clone of an object using JSON serialization
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Checks if a value is a plain object (not an array or null)
 * @param value - Value to check
 * @returns True if value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep merges template into target config
 * Adds missing keys from template while preserving existing values in target
 * Arrays are not merged recursively - target's arrays are kept as-is
 *
 * @param target - User's config object
 * @param template - Template with all required fields
 * @returns Object with hasChanges flag and merged result
 */
function deepMergeTemplate(target: unknown, template: unknown): MergeResult {
	// Template must be a plain object
	if (!isPlainObject(template)) {
		return { merged: target, hasChanges: false };
	}

	// If target is not an object, replace it entirely with template
	if (!isPlainObject(target)) {
		return { merged: deepClone(template), hasChanges: true };
	}

	let hasChanges = false;
	const merged: Record<string, unknown> = { ...target };

	for (const key in template) {
		const templateValue = template[key];
		const targetHasKey = key in merged;

		if (!targetHasKey) {
			// Key missing in target - add from template
			merged[key] = deepClone(templateValue);
			hasChanges = true;
		} else if (isPlainObject(templateValue) && isPlainObject(merged[key])) {
			// Both are plain objects - recursively merge
			const result = deepMergeTemplate(merged[key], templateValue);
			merged[key] = result.merged;
			hasChanges = hasChanges || result.hasChanges;
		}
		// If key exists and is not an object to merge, keep target's value
	}

	return { merged, hasChanges };
}

/**
 * Removes keys from config that don't exist in template
 * Recursively processes nested objects and removes empty parent objects
 *
 * @param config - User's config object to clean
 * @param template - Template defining valid structure
 * @returns Object with hasChanges flag and cleaned result
 */
function removeObsoleteKeys(config: unknown, template: unknown): MergeResult {
	// If template is not a plain object, nothing to remove from
	if (!isPlainObject(template)) {
		return { merged: config, hasChanges: false };
	}

	// If config is not an object, nothing to remove
	if (!isPlainObject(config)) {
		return { merged: config, hasChanges: false };
	}

	let hasChanges = false;
	const cleaned: Record<string, unknown> = {};

	// Only keep keys that exist in template
	for (const key in config) {
		if (!(key in template)) {
			// Key exists in config but not in template - remove it
			hasChanges = true;
			// Don't copy to cleaned object (effectively removes it)
		} else {
			const configValue = config[key];
			const templateValue = template[key];

			// Both are plain objects - recursively clean
			if (isPlainObject(configValue) && isPlainObject(templateValue)) {
				const result = removeObsoleteKeys(configValue, templateValue);

				// Only keep the key if the cleaned object is not empty
				if (Object.keys(result.merged as Record<string, unknown>).length > 0) {
					cleaned[key] = result.merged;
					hasChanges = hasChanges || result.hasChanges;
				} else {
					// Empty object after cleaning - remove it
					hasChanges = true;
				}
			} else {
				// Not both objects - keep config value as-is
				cleaned[key] = configValue;
			}
		}
	}

	return { merged: cleaned, hasChanges };
}

/**
 * Synchronizes config with template: adds missing keys and removes obsolete ones
 *
 * @param config - User's config object
 * @param template - Template with all required fields
 * @returns Object with hasChanges flag and synchronized result
 */
function syncWithTemplate(config: unknown, template: unknown): MergeResult {
	// First add missing keys from template
	const addResult = deepMergeTemplate(config, template);

	// Then remove obsolete keys not in template
	const removeResult = removeObsoleteKeys(addResult.merged, template);

	return {
		merged: removeResult.merged,
		hasChanges: addResult.hasChanges || removeResult.hasChanges,
	};
}

/**
 * Reads and parses the functionParams.jsonc file
 * @returns Parsed config or null if file doesn't exist or is invalid
 */
function readFunctionParamsConfig(): unknown | null {
	if (!fs.existsSync(FUNCTION_PARAMS_PATH)) {
		return null;
	}

	const fileContent = fs.readFileSync(FUNCTION_PARAMS_PATH, FILE_ENCODING);
	const config = parse(fileContent);

	if (!isPlainObject(config)) {
		console.error('Invalid functionParams.jsonc: must be an object');
		return null;
	}

	return config;
}

/**
 * Writes the updated functionParams config to file
 * @param config - Updated configuration object
 */
function writeFunctionParamsConfig(config: unknown): void {
	const serialized = JSON.stringify(config, null, JSON_INDENT);
	fs.writeFileSync(FUNCTION_PARAMS_PATH, serialized, FILE_ENCODING);
	console.log('Updated functionParams.jsonc: synchronized with current template');
}

/**
 * Validates and fixes functionParams.jsonc structure
 *
 * Ensures the config has complete structure matching FunctionParams type:
 * - Adds missing groups, actions, and fields from template
 * - Removes obsolete keys that no longer exist in template
 * - Removes empty groups after cleaning
 * - Preserves all existing user values for valid keys
 * - Does not modify arrays or existing fields
 *
 * Should be called on application startup
 */
export function validateAndFixFunctionParams(): void {
	try {
		const config = readFunctionParamsConfig();

		if (config === null) {
			return;
		}

		const { merged, hasChanges } = syncWithTemplate(config, FUNCTION_PARAMS_TEMPLATE);

		if (hasChanges) {
			writeFunctionParamsConfig(merged);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Failed to validate functionParams.jsonc: ${message}`);
	}
}
