import { Test, TestingModule } from '@nestjs/testing';
import { ContentSystemService } from './content_system.service';

describe('ContentSystemService', () => {
  let service: ContentSystemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentSystemService],
    }).compile();

    service = module.get<ContentSystemService>(ContentSystemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
