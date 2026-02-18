/**
 * Permission Checking Utilities
 *
 * Provides utilities for checking user permissions from JWT session.
 * Used by middleware and API routes for authorization.
 */

/**
 * Check if user has a specific permission
 */
export function hasPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required)
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(userPermissions: string[], required: string[]): boolean {
  return required.some((perm) => userPermissions.includes(perm))
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(userPermissions: string[], required: string[]): boolean {
  return required.every((perm) => userPermissions.includes(perm))
}

/**
 * Permission constants for common operations
 */
export const PERMISSIONS = {
  // Properties
  PROPERTIES_READ: 'properties:read',
  PROPERTIES_CREATE: 'properties:create',
  PROPERTIES_UPDATE: 'properties:update',
  PROPERTIES_DELETE: 'properties:delete',

  // Units
  UNITS_READ: 'units:read',
  UNITS_CREATE: 'units:create',
  UNITS_UPDATE: 'units:update',
  UNITS_DELETE: 'units:delete',

  // Projects
  PROJECTS_READ: 'projects:read',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',
  PROJECTS_ARCHIVE: 'projects:archive',

  // Tasks
  TASKS_READ: 'tasks:read',
  TASKS_CREATE: 'tasks:create',
  TASKS_UPDATE: 'tasks:update',
  TASKS_DELETE: 'tasks:delete',
  TASKS_COMPLETE: 'tasks:complete',

  // Work Orders
  WORK_ORDERS_READ: 'work_orders:read',
  WORK_ORDERS_CREATE: 'work_orders:create',
  WORK_ORDERS_UPDATE: 'work_orders:update',
  WORK_ORDERS_DELETE: 'work_orders:delete',
  WORK_ORDERS_RESPOND: 'work_orders:respond',

  // Partners
  PARTNERS_READ: 'partners:read',
  PARTNERS_CREATE: 'partners:create',
  PARTNERS_UPDATE: 'partners:update',
  PARTNERS_DELETE: 'partners:delete',

  // Costs
  COSTS_READ: 'costs:read',
  COSTS_CREATE: 'costs:create',
  COSTS_UPDATE: 'costs:update',
  COSTS_DELETE: 'costs:delete',
  COSTS_APPROVE: 'costs:approve',
  COSTS_EXPORT: 'costs:export',

  // Reports
  REPORTS_READ: 'reports:read',
  REPORTS_CREATE: 'reports:create',

  // Users
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  // Tenants
  TENANTS_READ: 'tenants:read',
  TENANTS_MANAGE: 'tenants:manage',

  // Tickets
  TICKETS_READ: 'tickets:read',
  TICKETS_CREATE: 'tickets:create',
  TICKETS_UPDATE: 'tickets:update',
  TICKETS_CONVERT: 'tickets:convert',

  // Audit
  AUDIT_READ: 'audit:read',

  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update'
} as const

/**
 * Route permission requirements map
 * Maps route patterns to required permissions
 */
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  // Properties
  'GET /api/properties': [PERMISSIONS.PROPERTIES_READ],
  'POST /api/properties': [PERMISSIONS.PROPERTIES_CREATE],
  'PUT /api/properties': [PERMISSIONS.PROPERTIES_UPDATE],
  'DELETE /api/properties': [PERMISSIONS.PROPERTIES_DELETE],

  // Units
  'GET /api/units': [PERMISSIONS.UNITS_READ],
  'POST /api/units': [PERMISSIONS.UNITS_CREATE],
  'PUT /api/units': [PERMISSIONS.UNITS_UPDATE],
  'DELETE /api/units': [PERMISSIONS.UNITS_DELETE],

  // Projects
  'GET /api/projects': [PERMISSIONS.PROJECTS_READ],
  'POST /api/projects': [PERMISSIONS.PROJECTS_CREATE],
  'PUT /api/projects': [PERMISSIONS.PROJECTS_UPDATE],
  'DELETE /api/projects': [PERMISSIONS.PROJECTS_DELETE],

  // Tasks
  'GET /api/tasks': [PERMISSIONS.TASKS_READ],
  'POST /api/tasks': [PERMISSIONS.TASKS_CREATE],
  'PUT /api/tasks': [PERMISSIONS.TASKS_UPDATE],
  'DELETE /api/tasks': [PERMISSIONS.TASKS_DELETE],

  // Work Orders
  'GET /api/work-orders': [PERMISSIONS.WORK_ORDERS_READ],
  'POST /api/work-orders': [PERMISSIONS.WORK_ORDERS_CREATE],
  'PUT /api/work-orders': [PERMISSIONS.WORK_ORDERS_UPDATE],
  'DELETE /api/work-orders': [PERMISSIONS.WORK_ORDERS_DELETE],

  // Partners
  'GET /api/partners': [PERMISSIONS.PARTNERS_READ],
  'POST /api/partners': [PERMISSIONS.PARTNERS_CREATE],
  'PUT /api/partners': [PERMISSIONS.PARTNERS_UPDATE],
  'DELETE /api/partners': [PERMISSIONS.PARTNERS_DELETE],

  // Costs
  'GET /api/costs': [PERMISSIONS.COSTS_READ],
  'POST /api/costs': [PERMISSIONS.COSTS_CREATE],
  'PUT /api/costs': [PERMISSIONS.COSTS_UPDATE],
  'DELETE /api/costs': [PERMISSIONS.COSTS_DELETE],

  // Reports
  'GET /api/reports': [PERMISSIONS.REPORTS_READ],
  'POST /api/reports': [PERMISSIONS.REPORTS_CREATE],

  // Users
  'GET /api/users': [PERMISSIONS.USERS_READ],
  'POST /api/users': [PERMISSIONS.USERS_CREATE],
  'PUT /api/users': [PERMISSIONS.USERS_UPDATE],
  'DELETE /api/users': [PERMISSIONS.USERS_DELETE],

  // Audit
  'GET /api/audit': [PERMISSIONS.AUDIT_READ],

  // Settings
  'GET /api/settings': [PERMISSIONS.SETTINGS_READ],
  'PUT /api/settings': [PERMISSIONS.SETTINGS_UPDATE]
}

/**
 * Check if a route method+path combination has a permission requirement
 */
export function getRoutePermissions(method: string, path: string): string[] | null {
  // Normalize path (remove query params, trailing slashes)
  const normalizedPath = path.split('?')[0].replace(/\/+$/, '')

  // Try exact match first
  const exactKey = `${method} ${normalizedPath}`
  if (ROUTE_PERMISSIONS[exactKey]) {
    return ROUTE_PERMISSIONS[exactKey]
  }

  // Try pattern matching for parameterized routes
  // e.g., /api/projects/123 should match /api/projects
  const pathParts = normalizedPath.split('/')
  while (pathParts.length > 2) {
    pathParts.pop()
    const parentPath = pathParts.join('/')
    const parentKey = `${method} ${parentPath}`
    if (ROUTE_PERMISSIONS[parentKey]) {
      return ROUTE_PERMISSIONS[parentKey]
    }
  }

  return null
}

/**
 * Role hierarchy for checking role levels
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 100,
  property_manager: 80,
  accounting: 60,
  hauswart: 40,
  tenant: 20,
  external_contractor: 10
}

/**
 * Check if a role is at least a certain level
 */
export function isRoleAtLeast(roleName: string, minimumRole: string): boolean {
  const roleLevel = ROLE_HIERARCHY[roleName] || 0
  const minimumLevel = ROLE_HIERARCHY[minimumRole] || 0
  return roleLevel >= minimumLevel
}

/**
 * Check if role is an internal role (can access dashboard)
 */
export function isInternalRole(roleName: string): boolean {
  return ['admin', 'property_manager', 'accounting', 'hauswart'].includes(roleName)
}
