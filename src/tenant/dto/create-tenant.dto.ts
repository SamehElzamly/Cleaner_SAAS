export class CreateTenantDto {
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';
}
