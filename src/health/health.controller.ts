import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

// PUBLIC on purpose (no JWT): hosting platforms and uptime monitors call this
// with no credentials. It exposes nothing sensitive — only "up / DB reachable".
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  check() {
    // mongoose readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    if (this.connection.readyState !== 1) {
      throw new ServiceUnavailableException({ status: 'error', db: 'disconnected' });
    }
    return { status: 'ok', db: 'connected', uptimeSeconds: Math.round(process.uptime()) };
  }
}
