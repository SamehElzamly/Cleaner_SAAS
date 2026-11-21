import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { WebhookEventDto } from './dto/webhook-event.dto.js';
import { WebhookSignatureGuard } from './webhook-signature.guard.js';

// PUBLIC route (no JWT — the gateway has no user account). Its only
// protection is the HMAC signature, so WebhookSignatureGuard is mandatory.
// Kept in its own controller so the JWT/role guards on PaymentsController
// can never be applied to it by accident (or removed from the other routes
// by mistake because of it).
@Controller('payments/webhook')
export class PaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(WebhookSignatureGuard)
  @HttpCode(200)
  @Post()
  handle(@Body() event: WebhookEventDto) {
    return this.paymentsService.handleWebhook(event);
  }
}
