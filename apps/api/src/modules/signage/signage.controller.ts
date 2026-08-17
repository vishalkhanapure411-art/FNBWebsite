import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SignageService } from './signage.service';
import {
  CreateContentDto,
  UpdateContentDto,
  QueryContentDto,
  CreatePlaylistDto,
  UpdatePlaylistDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  HeartbeatDto,
  AddContentToPlaylistDto,
  StatusTransitionDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@omniops/shared';

@ApiTags('Signage')
@Controller('signage')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class SignageController {
  constructor(private readonly signageService: SignageService) {}

  // ══════════════════════════════════════════════════
  // CONTENT
  // ══════════════════════════════════════════════════

  @Post('content')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Upload signage content' })
  createContent(@Body() dto: CreateContentDto, @CurrentUser() user: any) {
    return this.signageService.createContent(dto, user);
  }

  @Get('content')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'List signage content' })
  getContents(@Query() query: QueryContentDto, @CurrentUser() user: any) {
    return this.signageService.getContents(query, user);
  }

  @Get('content/:id')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'Get content detail with approval history' })
  getContentById(@Param('id') id: string) {
    return this.signageService.getContentById(id);
  }

  @Patch('content/:id')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Update content' })
  updateContent(@Param('id') id: string, @Body() dto: UpdateContentDto, @CurrentUser() user: any) {
    return this.signageService.updateContent(id, dto, user);
  }

  @Post('content/:id/submit')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Submit content for approval' })
  submitForApproval(@Param('id') id: string, @CurrentUser() user: any) {
    return this.signageService.submitForApproval(id, user);
  }

  @Post('content/:id/approve')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD, Role.MARKETING_ADMIN)
  @ApiOperation({ summary: 'Approve content' })
  approveContent(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: StatusTransitionDto,
  ) {
    return this.signageService.approveContent(id, user, dto);
  }

  @Post('content/:id/reject')
  @Roles(Role.SUPER_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD, Role.MARKETING_ADMIN)
  @ApiOperation({ summary: 'Reject content' })
  rejectContent(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: StatusTransitionDto,
  ) {
    return this.signageService.rejectContent(id, user, dto);
  }

  @Post('content/:id/go-live')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Set content live' })
  goLive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.signageService.goLive(id, user);
  }

  @Post('content/:id/expire')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Expire content' })
  expireContent(@Param('id') id: string, @CurrentUser() user: any) {
    return this.signageService.expireContent(id, user);
  }

  // ══════════════════════════════════════════════════
  // PLAYLISTS
  // ══════════════════════════════════════════════════

  @Post('playlists')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Create playlist' })
  createPlaylist(@Body() dto: CreatePlaylistDto, @CurrentUser() user: any) {
    return this.signageService.createPlaylist(dto, user);
  }

  @Get('playlists')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'List playlists' })
  getPlaylists(@Query('siteId') siteId: string, @CurrentUser() user: any) {
    return this.signageService.getPlaylists(user, siteId);
  }

  @Patch('playlists/:id')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Update playlist' })
  updatePlaylist(@Param('id') id: string, @Body() dto: UpdatePlaylistDto, @CurrentUser() user: any) {
    return this.signageService.updatePlaylist(id, dto, user);
  }

  @Post('playlists/:id/content')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Add content to playlist' })
  addContentToPlaylist(@Param('id') id: string, @Body() dto: AddContentToPlaylistDto) {
    return this.signageService.addContentToPlaylist(id, dto);
  }

  // ══════════════════════════════════════════════════
  // SCHEDULES
  // ══════════════════════════════════════════════════

  @Post('schedules')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Create schedule' })
  createSchedule(@Body() dto: CreateScheduleDto, @CurrentUser() user: any) {
    return this.signageService.createSchedule(dto, user);
  }

  @Get('schedules/:siteId')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'List schedules for a site' })
  getSchedules(@Param('siteId') siteId: string) {
    return this.signageService.getSchedules(siteId);
  }

  @Patch('schedules/:id')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Update schedule' })
  updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.signageService.updateSchedule(id, dto);
  }

  @Delete('schedules/:id')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER)
  @ApiOperation({ summary: 'Delete schedule' })
  deleteSchedule(@Param('id') id: string) {
    return this.signageService.deleteSchedule(id);
  }

  // ══════════════════════════════════════════════════
  // ACTIVE CONTENT
  // ══════════════════════════════════════════════════

  @Public()
  @Get('active/:siteId')
  @ApiOperation({ summary: 'Get active content for a site (public, for CDS)' })
  getActiveContent(@Param('siteId') siteId: string) {
    return this.signageService.getActiveContent(siteId);
  }

  // ══════════════════════════════════════════════════
  // SCREENS
  // ══════════════════════════════════════════════════

  @Get('screens/:siteId')
  @Roles(Role.SUPER_ADMIN, Role.MARKETING_ADMIN, Role.BRAND_MANAGER, Role.SITE_LEAD)
  @ApiOperation({ summary: 'List screens for a site' })
  getScreens(@Param('siteId') siteId: string) {
    return this.signageService.getScreens(siteId);
  }

  @Public()
  @Post('screens/heartbeat')
  @ApiOperation({ summary: 'Screen heartbeat (public, called by screen device)' })
  heartbeat(@Body() dto: HeartbeatDto) {
    return this.signageService.heartbeat(dto);
  }
}
