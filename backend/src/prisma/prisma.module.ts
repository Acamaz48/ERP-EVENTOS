import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @Global() torna o PrismaService disponível em toda a aplicação.
 * Isso evita a necessidade de importar o PrismaModule em módulos
 * específicos como UsersModule, EventsModule, etc., mantendo 
 * o pool de conexões único e centralizado.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
