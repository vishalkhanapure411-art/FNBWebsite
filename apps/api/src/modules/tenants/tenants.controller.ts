import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto, TenantStatusDto, QueryTenantsDto } from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@omniops/shared';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants with pagination, search, and filtering' })
  findAll(@Query() query: QueryTenantsDto) {
    return this.tenantsService.findAll(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all tenants as CSV' })
  async export(@Res() res: Response) {
    const csv = await this.tenantsService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tenants-export.csv"');
    res.send(csv);
  }

  @Post('bulk-onboard')
  @ApiOperation({ summary: 'Bulk onboard tenants from CSV upload' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  bulkOnboard(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }
    return this.tenantsService.bulkOnboard(file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID with sites summary' })
  findById(@Param('id') id: string) {
    return this.tenantsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant details' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change tenant status (ACTIVE ↔ SUSPENDED)' })
  updateStatus(@Param('id') id: string, @Body() dto: TenantStatusDto) {
    return this.tenantsService.updateStatus(id, dto);
  }
}
