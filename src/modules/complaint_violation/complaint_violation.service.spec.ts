import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintViolationService } from './complaint_violation.service';

describe('ComplaintViolationService', () => {
  let service: ComplaintViolationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComplaintViolationService],
    }).compile();

    service = module.get<ComplaintViolationService>(ComplaintViolationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
