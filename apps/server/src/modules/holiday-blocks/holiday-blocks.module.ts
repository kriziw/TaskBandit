import { Module } from '@nestjs/common';
import { HolidayBlocksController } from './holiday-blocks.controller';
import { HolidayBlocksService } from './holiday-blocks.service';
import { HolidayBlocksRepository } from './holiday-blocks.repository';

@Module({
  controllers: [HolidayBlocksController],
  providers: [HolidayBlocksService, HolidayBlocksRepository],
  exports: [HolidayBlocksRepository],
})
export class HolidayBlocksModule {}
