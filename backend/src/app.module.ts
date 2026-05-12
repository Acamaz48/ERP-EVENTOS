import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ServiceOrdersModule,
    // O módulo EventsModule foi cirurgicamente removido, pois o seu domínio
    // foi totalmente absorvido pelo ServiceOrdersModule (Aggregate Root).
  ],
})
export class AppModule {}