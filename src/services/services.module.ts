import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CleaningService, CleaningServiceSchema } from './entities/cleaning-service.entity.js';
import { ServicesService } from './services.service.js';
import { ServicesController } from './services.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CleaningService.name, schema: CleaningServiceSchema }]),
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
