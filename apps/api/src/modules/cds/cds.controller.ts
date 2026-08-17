import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CdsService } from './cds.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('CDS')
@Controller('cds')
export class CdsController {
  constructor(private readonly cdsService: CdsService) {}

  @Public()
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get CDS-formatted order view for customer display' })
  getCdsOrder(@Param('orderId') orderId: string) {
    return this.cdsService.getCdsOrderView(orderId);
  }

  @Public()
  @Get('upsells/:siteId')
  @ApiOperation({ summary: 'Get upsell suggestions for a site' })
  getUpsells() {
    return this.cdsService.getUpsells();
  }
}
