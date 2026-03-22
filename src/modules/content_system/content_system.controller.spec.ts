import { Test, TestingModule } from '@nestjs/testing';
import { ContentSystemController } from './content_system.controller';
import { ContentSystemService } from './content_system.service';

describe('ContentSystemController', () => {
  let controller: ContentSystemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentSystemController],
      providers: [ContentSystemService],
    }).compile();

    controller = module.get<ContentSystemController>(ContentSystemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
