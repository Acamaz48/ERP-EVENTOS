import { Test, TestingModule } from '@nestjs/testing';
import { ServiceOrdersController } from './service-orders.controller';

describe('ServiceOrdersController', () => {
  let controller: ServiceOrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceOrdersController],
    }).compile();

    controller = module.get<ServiceOrdersController>(ServiceOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
