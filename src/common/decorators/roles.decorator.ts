import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../auth/entities/user.entity.js';

export const ROLES_KEY = 'roles';

// Usage: @Roles(UserRole.ADMIN) or @Roles(UserRole.COMPANY, UserRole.ADMIN)
// Must be paired with RolesGuard — the decorator only attaches metadata,
// it doesn't enforce anything by itself.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
