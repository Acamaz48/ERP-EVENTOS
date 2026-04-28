import { Test, TestingModule } from '@nestjs/testing';
import { ServiceOrdersService } from './service-orders.service';

describe('ServiceOrdersService', () => {
  let service: ServiceOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceOrdersService],
    }).compile();

    service = module.get<ServiceOrdersService>(ServiceOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
