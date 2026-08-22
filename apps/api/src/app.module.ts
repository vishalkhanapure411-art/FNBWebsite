import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { SitesModule } from './modules/sites/sites.module';
import { UsersModule } from './modules/users/users.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { FloorPlansModule } from './modules/floor-plans/floor-plans.module';
import { TablesModule } from './modules/tables/tables.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CdsModule } from './modules/cds/cds.module';
import { CdsGateway } from './modules/cds/cds.gateway';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { QualityModule } from './modules/quality/quality.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { RevenueAssuranceModule } from './modules/revenue-assurance/revenue-assurance.module';
import { ExecAnalyticsModule } from './modules/exec-analytics/exec-analytics.module';
import { ForecastingModule } from './modules/forecasting/forecasting.module';
import { FieldReportsModule } from './modules/field-reports/field-reports.module';
import { SignageModule } from './modules/signage/signage.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { HealthController } from './health.controller';
import { KitchenGateway } from './common/gateways/kitchen.gateway';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantsModule,
    SitesModule,
    UsersModule,
    MenuModule,
    OrdersModule,
    ShiftsModule,
    FloorPlansModule,
    TablesModule,
    AnalyticsModule,
    PaymentsModule,
    CdsModule,
    MaintenanceModule,
    QualityModule,
    SurveysModule,
    RevenueAssuranceModule,
    ExecAnalyticsModule,
    ForecastingModule,
    FieldReportsModule,
    SignageModule,
    IncidentsModule,
  ],
  controllers: [HealthController],
  providers: [
    KitchenGateway,
    CdsGateway,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule {}
