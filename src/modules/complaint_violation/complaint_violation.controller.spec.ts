import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintViolationController } from './complaint_violation.controller';
import { ComplaintViolationService } from './complaint_violation.service';

describe('ComplaintViolationController', () => {
  let controller: ComplaintViolationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplaintViolationController],
      providers: [ComplaintViolationService],
    }).compile();

    controller = module.get<ComplaintViolationController>(ComplaintViolationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
