import { UserRole } from './entities/user.entity.js';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  // Both are needed for the Tenant Resolver / RBAC guards described in the
  // architecture plan — without them, nothing downstream of login could
  // scope a request to a tenant or check permissions without an extra DB
  // call. Previously missing entirely.
  tenantId: string | null; // null for platform-level admins with no tenant
  role: UserRole;
}