import {
  CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { verifyWebhookSignature } from './webhook-signature.js';

// Guards run BEFORE the ValidationPipe, so an unsigned/forged request is
// rejected here without its body ever being parsed or trusted.
//
// Requires: NestFactory.create(AppModule, { rawBody: true }) in main.ts — the
// signature is computed over the exact bytes the sender transmitted, which
// re-serializing parsed JSON can't reproduce.
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    // Fail closed: with no secret configured, NOTHING is accepted.
    if (!secret) throw new ServiceUnavailableException('Payment webhook is not configured');

    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const check = verifyWebhookSignature({
      secret,
      timestamp: req.header('x-timestamp'),
      signature: req.header('x-signature'),
      rawBody: req.rawBody,
    });
    if (!check.ok) throw new UnauthorizedException(`Webhook rejected: ${check.reason}`);
    return true;
  }
}
