import { Module } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrdersController } from './service-orders.controller';

@Module({
  providers: [ServiceOrdersService],
  controllers: [ServiceOrdersController],
})
export class ServiceOrdersModule {}
