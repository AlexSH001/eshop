/**
 * Role-based permissions configuration
 * 
 * This file defines what actions each role can perform.
 * Roles: 'admin' | 'super_admin'
 * 
 * To add a new permission:
 * 1. Add the permission key to the appropriate role(s)
 * 2. Use the permission in routes with: requirePermission('permission.key')
 * 
 * Note: Permissions can be managed via UI by super_admin, which will override these defaults.
 * These are fallback defaults used when no database permissions exist.
 */

const { database } = require('../database');

// Default permissions (used as fallback)
const defaultPermissions = {
  // Super Admin has all permissions
  super_admin: {
    // Admin Management
    'admins.view': true,
    'admins.create': true,
    'admins.update': true,
    'admins.delete': true,
    
    // User Management
    'users.view': true,
    'users.create': true,
    'users.update': true,
    'users.delete': true,
    'users.toggle_status': true,
    
    // Product Management
    'products.view': true,
    'products.create': true,
    'products.update': true,
    'products.delete': true,
    'products.publish': true,
    
    // Category Management
    'categories.view': true,
    'categories.create': true,
    'categories.update': true,
    'categories.delete': true,
    
    // Order Management
    'orders.view': true,
    'orders.update': true,
    'orders.cancel': true,
    'orders.refund': true,
    'orders.delete': true,
    
    // Dashboard & Analytics
    'dashboard.view': true,
    'analytics.view': true,
    'analytics.export': true,
    
    // System Settings
    'settings.view': true,
    'settings.update': true,
    'system.health': true,
  },
  
  // Regular Admin permissions (more restricted)
  admin: {
    // Admin Management - NO ACCESS
    'admins.view': false,
    'admins.create': false,
    'admins.update': false,
    'admins.delete': false,
    
    // User Management - VIEW ONLY
    'users.view': true,
    'users.create': false,
    'users.update': false,
    'users.delete': false,
    'users.toggle_status': true, // Can activate/deactivate users
    
    // Product Management - FULL ACCESS
    'products.view': true,
    'products.create': true,
    'products.update': true,
    'products.delete': false, // Cannot delete products
    'products.publish': true,
    
    // Category Management - FULL ACCESS
    'categories.view': true,
    'categories.create': true,
    'categories.update': true,
    'categories.delete': false, // Cannot delete categories
    
    // Order Management - VIEW AND UPDATE STATUS
    'orders.view': true,
    'orders.update': true,
    'orders.cancel': true,
    'orders.refund': false, // Cannot issue refunds
    'orders.delete': false, // Cannot delete orders
    
    // Dashboard & Analytics - VIEW ONLY
    'dashboard.view': true,
    'analytics.view': true,
    'analytics.export': false, // Cannot export analytics
    
    // System Settings - NO ACCESS
    'settings.view': false,
    'settings.update': false,
    'system.health': false,
  }
};

// Cache for permissions (refreshed on updates)
let permissionsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Load permissions from database, with fallback to defaults
 * @returns {Promise<Object>} - Permissions object
 */
async function loadPermissionsFromDatabase() {
  try {
    const dbPermissions = await database.query(`
      SELECT role, permission_key, is_allowed
      FROM role_permissions
    `);

    // Build permissions object from database
    const dbPerms = {
      super_admin: {},
      admin: {}
    };

    dbPermissions.forEach(row => {
      if (!dbPerms[row.role]) {
        dbPerms[row.role] = {};
      }
      dbPerms[row.role][row.permission_key] = row.is_allowed === 1 || row.is_allowed === true;
    });

    // Merge with defaults (database takes precedence, but fill missing with defaults)
    const merged = {
      super_admin: { ...defaultPermissions.super_admin, ...dbPerms.super_admin },
      admin: { ...defaultPermissions.admin, ...dbPerms.admin }
    };

    return merged;
  } catch (error) {
    console.error('Error loading permissions from database:', error);
    // Return defaults on error
    return defaultPermissions;
  }
}

/**
 * Get permissions (with caching)
 * @returns {Promise<Object>} - Permissions object
 */
async function getPermissions() {
  const now = Date.now();
  
  // Return cached if still valid
  if (permissionsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return permissionsCache;
  }

  // Load from database
  permissionsCache = await loadPermissionsFromDatabase();
  cacheTimestamp = now;
  
  return permissionsCache;
}

/**
 * Invalidate permissions cache (call after updates)
 */
function invalidatePermissionsCache() {
  permissionsCache = null;
  cacheTimestamp = 0;
}

/**
 * Check if a role has a specific permission
 * @param {string} role - The role to check ('admin' | 'super_admin')
 * @param {string} permission - The permission key (e.g., 'products.create')
 * @returns {Promise<boolean>} - True if the role has the permission
 */
async function hasPermission(role, permission) {
  if (!role || !permission) {
    return false;
  }
  
  const permissions = await getPermissions();
  const rolePermissions = permissions[role];
  if (!rolePermissions) {
    return false;
  }
  
  // Explicitly check if permission exists and is true
  return rolePermissions[permission] === true;
}

/**
 * Synchronous version for backward compatibility (uses cache or defaults)
 * @param {string} role - The role to check
 * @param {string} permission - The permission key
 * @returns {boolean} - True if the role has the permission
 */
function hasPermissionSync(role, permission) {
  if (!role || !permission) {
    return false;
  }
  
  // Use cache if available, otherwise use defaults
  const perms = permissionsCache || defaultPermissions;
  const rolePermissions = perms[role];
  if (!rolePermissions) {
    return false;
  }
  
  return rolePermissions[permission] === true;
}

/**
 * Get all permissions for a role
 * @param {string} role - The role to get permissions for
 * @returns {Promise<Object>} - Object with all permissions for the role
 */
async function getRolePermissions(role) {
  const permissions = await getPermissions();
  return permissions[role] || {};
}

/**
 * Get all available permission keys
 * @returns {string[]} - Array of all permission keys
 */
function getAllPermissions() {
  const allPerms = new Set();
  Object.values(permissions).forEach(rolePerms => {
    Object.keys(rolePerms).forEach(perm => allPerms.add(perm));
  });
  return Array.from(allPerms);
}

module.exports = {
  defaultPermissions,
  hasPermission,
  hasPermissionSync,
  getRolePermissions,
  getAllPermissions,
  getPermissions,
  invalidatePermissionsCache,
  loadPermissionsFromDatabase
};

