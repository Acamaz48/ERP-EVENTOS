import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    // Valida se a injeção de dependência do módulo global está operando
    expect(service).toBeDefined();
  });

  it('should call $connect on initialization', async () => {
    // Fazemos um mock (espião) para garantir que o método de conexão será invocado,
    // sem de fato abrir uma conexão pesada com o banco durante os testes.
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('should call $disconnect on destruction', async () => {
    // Fazemos um mock para garantir que a proteção contra leak de memória funciona.
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
