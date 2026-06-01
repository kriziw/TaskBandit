import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../common/auth/authenticated-user.type';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateHolidayBlockDto } from './dto/create-holiday-block.dto';
import { HolidayBlocksService } from './holiday-blocks.service';

@ApiTags('holiday-blocks')
@Controller('api/holiday-blocks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HolidayBlocksController {
  constructor(private readonly service: HolidayBlocksService) {}

  @Get()
  @Roles('admin')
  listBlocks(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listBlocks(user);
  }

  @Post()
  @Roles('admin')
  createBlock(@Body() dto: CreateHolidayBlockDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createBlock(dto, user);
  }

  @Delete(':id')
  @Roles('admin')
  deleteBlock(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.deleteBlock(id, user);
  }

  @Post(':id/end-early')
  @Roles('admin')
  endBlockEarly(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.endBlockEarly(id, user);
  }
}
