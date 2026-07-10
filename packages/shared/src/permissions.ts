import { MODEL_ROLES, TOOL_PERMISSIONS } from './constants.js';
import { ModelRole } from './types.js';
export type ToolPermission = typeof TOOL_PERMISSIONS[number];
export const destructivePermissions = new Set<ToolPermission>(['write_github_branch','create_pull_request','runpod_start_stop']);
export function isKnownPermission(value: string): value is ToolPermission { return (TOOL_PERMISSIONS as readonly string[]).includes(value); }
export function isKnownModelRole(value: string): value is ModelRole { return (MODEL_ROLES as readonly string[]).includes(value); }
