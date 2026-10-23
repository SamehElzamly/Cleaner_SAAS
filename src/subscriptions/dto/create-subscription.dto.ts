import { IsMongoId, IsNotEmpty } from 'class-validator';

// No tenantId: the subscription always belongs to the CALLER's own tenant,
// taken from the JWT — never from the body.
export class CreateSubscriptionDto {
  @IsMongoId({ message: 'planId must be a valid Mongo ObjectId' })
  @IsNotEmpty()
  planId: string;
}
