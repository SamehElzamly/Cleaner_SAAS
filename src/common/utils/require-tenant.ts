import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../decorators/current-user.decorator.js';

// Every tenant-scoped controller gets its tenantId from the caller's JWT
// through this one function — never from the URL or body. Refuses (instead
// of silently filtering by `undefined`) if the account has no tenant.
export function requireTenant(user: AuthenticatedUser): string {
  if (!user.tenantId) {
    throw new ForbiddenException('No tenant associated with this account');
  }
  return user.tenantId;
}
