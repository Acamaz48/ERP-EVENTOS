import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Utilizando o Logger nativo do NestJS para melhor rastreabilidade em console/arquivos
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Inicializamos o Prisma interceptando warnings e erros do banco diretamente
    super({
      log: ['warn', 'error'],
    });
  }

  /**
   * Disparado automaticamente quando a aplicação NestJS sobe.
   * Abre o pool de conexões de forma segura.
   */
  async onModuleInit() {
    this.logger.log('Estabelecendo conexão com o banco de dados via Prisma...');
    await this.$connect();
    this.logger.log('Conexão com banco de dados estabelecida com sucesso.');
  }

  /**
   * Disparado automaticamente quando a aplicação recebe sinal de desligamento (SIGINT/SIGTERM).
   * EXTREMAMENTE NECESSÁRIO para evitar "Connection Leaks" e erro "Too many clients" no PostgreSQL.
   */
  async onModuleDestroy() {
    this.logger.warn('Encerrando gracefulmente o pool de conexões do Prisma...');
    await this.$disconnect();
    this.logger.log('Conexões do banco de dados encerradas.');
  }
}