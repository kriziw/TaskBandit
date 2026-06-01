import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { CreateHolidayBlockDto } from './dto/create-holiday-block.dto';
import { HolidayBlocksRepository } from './holiday-blocks.repository';

@Injectable()
export class HolidayBlocksService {
  constructor(private readonly repository: HolidayBlocksRepository) {}

  listBlocks(user: AuthenticatedUser) {
    return this.repository.listBlocks(user.householdId);
  }

  createBlock(dto: CreateHolidayBlockDto, user: AuthenticatedUser) {
    return this.repository.createBlock(dto, user.householdId, user.id);
  }

  deleteBlock(id: string, user: AuthenticatedUser) {
    return this.repository.deleteBlock(id, user.householdId);
  }

  endBlockEarly(id: string, user: AuthenticatedUser) {
    return this.repository.endBlockEarly(id, user.householdId);
  }
}
