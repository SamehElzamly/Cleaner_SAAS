import { IsIn, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../auth/entities/user.entity.js';

// ADMIN excluded on purpose: a tenant's own admin (COMPANY) must never be
// able to promote anyone — including themselves — to a platform-level role
// through a tenant-scoped endpoint.
const ASSIGNABLE_ROLES = [UserRole.COMPANY, UserRole.EMPLOYEE, UserRole.USER] as const;

export class UpdateUserRoleDto {
  @IsNotEmpty()
  @IsIn(ASSIGNABLE_ROLES, {
    message: `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
  })
  role: UserRole;
}
