import { IsIanaTimezone } from '../../common/validators/is-iana-timezone.validator.js';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'slug must contain only lowercase letters, numbers and hyphens (e.g. "acme-cleaning")',
  })
  slug: string;

  // The actual subdomain the tenant will be reached at (e.g. "acme" for
  // acme.0cleaner.com). Same format rules as slug, but validated and stored
  // separately since the two can diverge later (a tenant can request a
  // different public subdomain without changing its internal slug).
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'subdomain must contain only lowercase letters, numbers and hyphens (e.g. "acme-cleaning")',
  })
  subdomain: string;

  // Optional on purpose: the Plans/Subscriptions module (Phase 2) doesn't
  // exist yet, so a tenant can be created with no plan and assigned one
  // later via UpdateTenantDto.
  @IsOptional()
  @IsMongoId()
  planId?: string;

  // Defaults to "UTC" if omitted. Set it to the company's real timezone
  // (e.g. "Africa/Cairo") so bookings line up with staff working hours.
  @IsOptional()
  @IsIanaTimezone()
  timezone?: string;

  // 3-letter ISO 4217 code, e.g. "EGP". Defaults to "USD" if omitted.
  @IsOptional()
  @Matches(/^[A-Za-z]{3}$/, { message: 'currency must be a 3-letter code, e.g. EGP' })
  currency?: string;

  // `status` is intentionally NOT accepted here. A new tenant always starts
  // as ACTIVE — letting the client set it on creation would let anyone
  // create a pre-suspended or pre-deleted tenant. Status is only changeable
  // afterwards, through UpdateTenantDto, by an authorized admin.
}
