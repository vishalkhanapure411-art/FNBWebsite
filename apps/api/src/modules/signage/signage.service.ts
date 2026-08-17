import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SignageContentStatus, SignageApprovalStatus, Role } from '@omniops/shared';
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

@Injectable()
export class SignageService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════════
  // CONTENT CRUD
  // ══════════════════════════════════════════════════

  async createContent(dto: CreateContentDto, user: any) {
    // Site-scoped users (e.g. a branch MARKETING_ADMIN) may only create content
    // for their own site; central users may scope content to any site in their
    // tenant (or leave it null for global/tenant-wide content).
    let siteId: string | null = null;
    if (user.siteId) {
      if (dto.siteId && dto.siteId !== user.siteId) {
        throw new ForbiddenException('Site-scoped users can only create content for their own site');
      }
      siteId = user.siteId;
    } else {
      siteId = dto.siteId ?? null;
    }

    let tenantId: string | null = user.tenantId ?? null;
    if (siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: siteId },
        select: { tenantId: true },
      });
      if (!site) throw new BadRequestException('Site not found');
      if (user.tenantId && site.tenantId !== user.tenantId) {
        throw new ForbiddenException('Site does not belong to your tenant');
      }
      tenantId = site.tenantId; // derive from site (covers SUPER_ADMIN with no tenantId)
    }
    if (!tenantId) {
      throw new ForbiddenException('Cannot create signage content without a tenant');
    }

    return this.prisma.signageContent.create({
      data: {
        title: dto.title,
        description: dto.description,
        mediaType: dto.mediaType,
        mediaUrl: dto.mediaUrl,
        thumbnailUrl: dto.thumbnailUrl,
        duration: dto.duration ?? 10,
        tenantId,
        submittedById: user.sub ?? '',
        siteId,
        playlistId: dto.playlistId,
        status: SignageContentStatus.DRAFT,
      },
    });
  }

  async getContents(query: QueryContentDto, user: any) {
    // Tenant scoping (API-layer isolation, no DB RLS)
    const and: any[] = [];
    if (user.tenantId) {
      and.push({ tenantId: user.tenantId });
    }

    // Site-scoped users see only their own site's content plus global (siteId null) content
    if (user.siteId) {
      and.push({ OR: [{ siteId: user.siteId }, { siteId: null }] });
    } else if (query.siteId) {
      and.push({ siteId: query.siteId });
    }

    if (query.status) {
      and.push({ status: query.status });
    }
    if (query.search) {
      and.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    const where = and.length ? { AND: and } : {};

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.signageContent.findMany({
        where,
        include: {
          site: { select: { id: true, name: true } },
          submittedBy: { select: { id: true, firstName: true, lastName: true } },
          playlist: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.signageContent.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getContentById(id: string) {
    const content = await this.prisma.signageContent.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        playlist: { select: { id: true, name: true } },
        approvals: {
          include: {
            approvedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        schedules: true,
      },
    });
    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  async updateContent(id: string, dto: UpdateContentDto, user: any) {
    const content = await this.prisma.signageContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content not found');

    // Site-scoped users may only update content belonging to their own site
    if (user.siteId && content.siteId !== user.siteId) {
      throw new ForbiddenException('Site-scoped users can only update content for their own site');
    }

    return this.prisma.signageContent.update({
      where: { id },
      data: { ...dto },
    });
  }

  // ══════════════════════════════════════════════════
  // STATUS WORKFLOW
  // ══════════════════════════════════════════════════

  async submitForApproval(id: string, user: any) {
    const content = await this.prisma.signageContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content not found');
    if (content.status !== SignageContentStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT content can be submitted for approval');
    }

    return this.prisma.signageContent.update({
      where: { id },
      data: { status: SignageContentStatus.PENDING_APPROVAL },
    });
  }

  async approveContent(id: string, user: any, dto: StatusTransitionDto) {
    const content = await this.prisma.signageContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content not found');
    if (content.status !== SignageContentStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only PENDING_APPROVAL content can be approved');
    }

    // Check user has site-lead or higher role
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.BRAND_MANAGER && user.role !== Role.SITE_LEAD) {
      throw new ForbiddenException('Only SITE_LEAD or above can approve content');
    }

    await this.prisma.signageApproval.create({
      data: {
        contentId: id,
        approvedById: user.id,
        status: SignageApprovalStatus.APPROVED,
        comment: dto.comment,
      },
    });

    return this.prisma.signageContent.update({
      where: { id },
      data: { status: SignageContentStatus.APPROVED },
    });
  }

  async rejectContent(id: string, user: any, dto: StatusTransitionDto) {
    const content = await this.prisma.signageContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content not found');
    if (content.status !== SignageContentStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only PENDING_APPROVAL content can be rejected');
    }

    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.BRAND_MANAGER && user.role !== Role.SITE_LEAD) {
      throw new ForbiddenException('Only SITE_LEAD or above can reject content');
    }

    await this.prisma.signageApproval.create({
      data: {
        contentId: id,
        approvedById: user.id,
        status: SignageApprovalStatus.REJECTED,
        comment: dto.comment,
      },
    });

    return this.prisma.signageContent.update({
      where: { id },
      data: { status: SignageContentStatus.REJECTED },
    });
  }

  async goLive(id: string, user: any) {
    const content = await this.prisma.signageContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content not found');
    if (content.status !== SignageContentStatus.APPROVED) {
      throw new BadRequestException('Only APPROVED content can go live');
    }

    return this.prisma.signageContent.update({
      where: { id },
      data: { status: SignageContentStatus.LIVE },
    });
  }

  async expireContent(id: string, user: any) {
    const content = await this.prisma.signageContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Content not found');

    return this.prisma.signageContent.update({
      where: { id },
      data: { status: SignageContentStatus.EXPIRED },
    });
  }

  // ══════════════════════════════════════════════════
  // PLAYLISTS
  // ══════════════════════════════════════════════════

  async createPlaylist(dto: CreatePlaylistDto, user: any) {
    // Site-scoped users may only create playlists for their own site
    let siteId: string | null = null;
    if (user.siteId) {
      if (dto.siteId && dto.siteId !== user.siteId) {
        throw new ForbiddenException('Site-scoped users can only create playlists for their own site');
      }
      siteId = user.siteId;
    } else {
      siteId = dto.siteId ?? null;
    }

    let tenantId: string | null = user.tenantId ?? null;
    if (siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: siteId },
        select: { tenantId: true },
      });
      if (!site) throw new BadRequestException('Site not found');
      if (user.tenantId && site.tenantId !== user.tenantId) {
        throw new ForbiddenException('Site does not belong to your tenant');
      }
      tenantId = site.tenantId;
    }
    if (!tenantId) {
      throw new ForbiddenException('Cannot create a signage playlist without a tenant');
    }

    return this.prisma.signagePlaylist.create({
      data: {
        name: dto.name,
        tenantId,
        siteId,
      },
    });
  }

  async getPlaylists(user: any, siteId?: string) {
    const and: any[] = [];
    if (user.tenantId) and.push({ tenantId: user.tenantId });

    // Site-scoped users see only their own site's playlists plus global (siteId null) playlists
    if (user.siteId) {
      and.push({ OR: [{ siteId: user.siteId }, { siteId: null }] });
    } else if (siteId) {
      and.push({ siteId });
    }

    return this.prisma.signagePlaylist.findMany({
      where: and.length ? { AND: and } : {},
      include: {
        _count: { select: { contents: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updatePlaylist(id: string, dto: UpdatePlaylistDto, user: any) {
    const playlist = await this.prisma.signagePlaylist.findUnique({ where: { id } });
    if (!playlist) throw new NotFoundException('Playlist not found');

    // Site-scoped users may only update playlists belonging to their own site
    if (user.siteId && playlist.siteId !== user.siteId) {
      throw new ForbiddenException('Site-scoped users can only update playlists for their own site');
    }

    return this.prisma.signagePlaylist.update({
      where: { id },
      data: { ...dto },
    });
  }

  async addContentToPlaylist(playlistId: string, dto: AddContentToPlaylistDto) {
    const playlist = await this.prisma.signagePlaylist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw new NotFoundException('Playlist not found');

    const content = await this.prisma.signageContent.findUnique({ where: { id: dto.contentId } });
    if (!content) throw new NotFoundException('Content not found');

    return this.prisma.signageContent.update({
      where: { id: dto.contentId },
      data: { playlistId },
    });
  }

  // ══════════════════════════════════════════════════
  // SCHEDULES
  // ══════════════════════════════════════════════════

  async createSchedule(dto: CreateScheduleDto, user: any) {
    // Site-scoped users may only create schedules for their own site
    if (user.siteId && dto.siteId !== user.siteId) {
      throw new ForbiddenException('Site-scoped users can only create schedules for their own site');
    }
    if (user.tenantId) {
      const site = await this.prisma.site.findUnique({
        where: { id: dto.siteId },
        select: { tenantId: true },
      });
      if (!site) throw new BadRequestException('Site not found');
      if (site.tenantId !== user.tenantId) {
        throw new ForbiddenException('Site does not belong to your tenant');
      }
    }

    return this.prisma.signageSchedule.create({
      data: {
        playlistId: dto.playlistId,
        contentId: dto.contentId,
        siteId: dto.siteId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async getSchedules(siteId: string) {
    return this.prisma.signageSchedule.findMany({
      where: { siteId, isActive: true },
      include: {
        playlist: { select: { id: true, name: true } },
        content: { select: { id: true, title: true, mediaType: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto) {
    const schedule = await this.prisma.signageSchedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException('Schedule not found');

    return this.prisma.signageSchedule.update({
      where: { id },
      data: { ...dto },
    });
  }

  async deleteSchedule(id: string) {
    const schedule = await this.prisma.signageSchedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException('Schedule not found');

    return this.prisma.signageSchedule.delete({ where: { id } });
  }

  // ══════════════════════════════════════════════════
  // ACTIVE CONTENT (daypart scheduling)
  // ══════════════════════════════════════════════════

  async getActiveContent(siteId: string) {
    // Get current time in HH:mm format
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay(); // 0=Sun, 6=Sat

    // Find schedules active for this day+time
    const schedules = await this.prisma.signageSchedule.findMany({
      where: {
        siteId,
        isActive: true,
        startTime: { lte: currentTime },
        endTime: { gte: currentTime },
        OR: [
          { dayOfWeek: { has: currentDay } },
          { dayOfWeek: { isEmpty: true } },
        ],
      },
      include: {
        playlist: {
          include: {
            contents: {
              where: { status: SignageContentStatus.LIVE },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        content: true,
      },
      orderBy: { startTime: 'asc' },
    });

    if (schedules.length === 0) {
      // Fallback: return any LIVE content for this site
      const liveContent = await this.prisma.signageContent.findMany({
        where: {
          siteId,
          status: SignageContentStatus.LIVE,
        },
        orderBy: { updatedAt: 'desc' },
      });
      return { type: 'content_list', items: liveContent, source: 'fallback' };
    }

    const schedule = schedules[0]!;

    if (schedule.content) {
      return {
        type: 'single',
        item: schedule.content,
        schedule: { startTime: schedule.startTime, endTime: schedule.endTime },
        source: 'schedule',
      };
    }

    if (schedule.playlist) {
      return {
        type: 'playlist',
        name: schedule.playlist.name,
        items: schedule.playlist.contents,
        schedule: { startTime: schedule.startTime, endTime: schedule.endTime },
        source: 'schedule',
      };
    }

    // Fallback
    const liveContent = await this.prisma.signageContent.findMany({
      where: { siteId, status: SignageContentStatus.LIVE },
      orderBy: { updatedAt: 'desc' },
    });
    return { type: 'content_list', items: liveContent, source: 'fallback' };
  }

  // ══════════════════════════════════════════════════
  // SCREENS
  // ══════════════════════════════════════════════════

  async getScreens(siteId: string) {
    return this.prisma.signageScreen.findMany({
      where: { siteId },
      orderBy: { name: 'asc' },
    });
  }

  async heartbeat(dto: HeartbeatDto) {
    const screen = await this.prisma.signageScreen.upsert({
      where: { deviceId: dto.deviceId },
      create: {
        deviceId: dto.deviceId,
        siteId: dto.siteId,
        name: dto.deviceId,
        lastHeartbeat: new Date(),
        isOnline: true,
      },
      update: {
        lastHeartbeat: new Date(),
        isOnline: true,
      },
    });
    return screen;
  }
}
