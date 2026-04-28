import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { EventsModule } from './modules/events/events.module';
import { MaterialsModule } from './modules/materials/materials.module';

@Module({
  imports: [PrismaModule, AuthModule, ServiceOrdersModule, EventsModule, MaterialsModule],
})
export class AppModule {}