import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RevenueAssuranceService } from '../revenue-assurance/revenue-assurance.service';
import { SurveysService } from '../surveys/surveys.service';
import { Role } from '@omniops/shared';
import { Prisma } from '@prisma/client';
import {
  ExecAnalyticsQueryDto,
  ExecAnalyticsGranularity,
} from './dto/exec-analytics-query.dto';

type AuthUser = { tenantId: string | null; role: Role; siteId?: string | null; id: string };

/**
 * EXEC ANALYTICS — cross-site, tenant-wide analytics for executives.
 *
 * REVENUE DEFINITION (documented): `totalRevenue` = sum of `grandTotal` over
 * orders whose status is NOT IN ('CANCELLED', 'REFUNDED') — the exact definition
 * used by the site-level analytics module (sales summary, realtime, costs,
 * benchmarking). Net of discounts (grandTotal already includes discounts).
 * DRAFT orders carry grandTotal 0 in practice and are included for consistency
 * with the analytics module (they never move money).
 *
 * ANOMALY aggregation: anomalyCount / anomalyValue are produced by the
 * revenue-assurance detection engine (RevenueAssuranceService.getSummary) per
 * site over the same date window, then summed across sites. The RA engine runs
 * its rules over non-DRAFT orders (including CANCELLED/REFUNDED, which is how
 * it catches void/refund spikes) — so anomaly metrics deliberately span a
 * slightly different order set than the revenue KPI above.
 *
 * NPS aggregation: per-site NPS = average of per-survey NPS scores (computed by
 * SurveysService.getAnalytics) across surveys at that site that have at least
 * one NPS answer; avgNps = average of per-site NPS values across sites with
 * responses. A site with no survey responses has npsScore = null and is
 * excluded from avgNps. If no site has responses, avgNps = null.
 */
@Injectable()
export class ExecAnalyticsService {
  constructor(
    private prisma: PrismaService,
    private revenueAssurance: RevenueAssuranceService,
    private surveys: SurveysService,
  ) {}

  // ══════════════════════════════════════════════════
  // OVERVIEW — tenant-wide KPIs + revenue trend
  // ══════════════════════════════════════════════════

  async getOverview(query: ExecAnalyticsQueryDto, user: AuthUser) {
    const { tenantId, from, to } = await this.resolveContext(query, user);
    const granularity = this.resolveGranularity(query.granularity, from, to);

    const sites = await this.prisma.site.findMany({
      where: { tenantId, status: { not: 'CLOSED' } },
      select: { id: true, name: true },
    });
    const siteIds = sites.map((s) => s.id);

    // ── Revenue / orders (analytics-module definition) ──
    const orderWhere: Prisma.OrderWhereInput = {
      tenantId,
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
      createdAt: { gte: from, lt: to },
    };
    const [agg, ordersForTrend] = await Promise.all([
      this.prisma.order.aggregate({
        where: orderWhere,
        _count: { id: true },
        _sum: { grandTotal: true },
      }),
      this.prisma.order.findMany({
        where: orderWhere,
        select: { createdAt: true, grandTotal: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const totalOrders = agg._count.id;
    const totalRevenue = this.round(Number(agg._sum.grandTotal ?? 0));
    const avgCheck = totalOrders > 0 ? this.round(totalRevenue / totalOrders) : 0;

    // ── Anomalies (revenue-assurance engine, summed across sites) ──
    let anomalyCount = 0;
    let anomalyValue = 0;
    for (const site of sites) {
      const summary = await this.revenueAssurance.getSummary(
        { siteId: site.id, from: from.toISOString(), to: to.toISOString() },
        user,
      );
      anomalyCount += summary.data.anomalyCount;
      anomalyValue += summary.data.anomalyValue;
    }
    anomalyValue = this.round(anomalyValue);

    // ── NPS (surveys service, per site) ──
    const npsBySite = await this.getNpsBySite(sites, from, to, user);

    const activeSites = sites.length;
    const avgNps = this.averageOfNonNull(npsBySite.map((n) => n.npsScore));

    // ── Daily / weekly revenue trend (zero-filled for a continuous series) ──
    const trend = this.buildTrend(ordersForTrend, from, to, granularity);

    return {
      success: true,
      data: {
        tenantId,
        from: from.toISOString(),
        to: to.toISOString(),
        granularity,
        totalRevenue,
        totalOrders,
        avgCheck,
        activeSites,
        anomalyCount,
        anomalyValue,
        avgNps,
        trend,
      },
    };
  }

  // ══════════════════════════════════════════════════
  // SITE COMPARISON — per-site rows with ranks
  // ══════════════════════════════════════════════════

  async getSiteComparison(query: ExecAnalyticsQueryDto, user: AuthUser) {
    const { tenantId, from, to } = await this.resolveContext(query, user);

    const sites = await this.prisma.site.findMany({
      where: { tenantId, status: { not: 'CLOSED' } },
      select: { id: true, name: true },
    });

    const orderWhere: Prisma.OrderWhereInput = {
      tenantId,
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
      createdAt: { gte: from, lt: to },
    };
    const bySite = await this.prisma.order.groupBy({
      by: ['siteId'],
      where: orderWhere,
      _count: { id: true },
      _sum: { grandTotal: true },
    });
    const siteStats = new Map(
      bySite.map((r) => [
        r.siteId,
        { orders: r._count.id, revenue: this.round(Number(r._sum.grandTotal ?? 0)) },
      ]),
    );

    const npsBySite = await this.getNpsBySite(sites, from, to, user);
    const npsMap = new Map(npsBySite.map((n) => [n.siteId, n.npsScore]));

    const rows: Array<{
      siteId: string;
      siteName: string;
      revenue: number;
      orders: number;
      avgCheck: number;
      anomalyCount: number;
      anomalyValue: number;
      npsScore: number | null;
      revenueRank: number;
      anomalyRank: number;
    }> = [];

    for (const site of sites) {
      const stats = siteStats.get(site.id) ?? { orders: 0, revenue: 0 };
      const summary = await this.revenueAssurance.getSummary(
        { siteId: site.id, from: from.toISOString(), to: to.toISOString() },
        user,
      );
      rows.push({
        siteId: site.id,
        siteName: site.name,
        revenue: stats.revenue,
        orders: stats.orders,
        avgCheck: stats.orders > 0 ? this.round(stats.revenue / stats.orders) : 0,
        anomalyCount: summary.data.anomalyCount,
        anomalyValue: summary.data.anomalyValue,
        npsScore: npsMap.get(site.id) ?? null,
        revenueRank: 0,
        anomalyRank: 0,
      });
    }

    // Revenue rank: 1 = highest revenue.
    const byRevenue = [...rows].sort((a, b) => b.revenue - a.revenue);
    byRevenue.forEach((r, i) => (r.revenueRank = i + 1));

    // Anomaly rank: 1 = highest anomaly VALUE (most risk).
    const byAnomaly = [...rows].sort(
      (a, b) => b.anomalyValue - a.anomalyValue || b.anomalyCount - a.anomalyCount,
    );
    byAnomaly.forEach((r, i) => (r.anomalyRank = i + 1));

    rows.sort((a, b) => a.revenueRank - b.revenueRank);

    return {
      success: true,
      data: { tenantId, from: from.toISOString(), to: to.toISOString(), sites: rows },
    };
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════

  /**
   * Resolve the tenant + date window. SUPER_ADMIN may target any tenant via
   * ?tenantId (defaults to the first tenant so the admin UI works without a
   * tenant picker). Non-super admins are always pinned to their own tenant.
   */
  private async resolveContext(query: ExecAnalyticsQueryDto, user: AuthUser) {
    let tenantId = query.tenantId;
    if (!tenantId) {
      if (user.role === Role.SUPER_ADMIN) {
        const first = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
        if (!first) throw new BadRequestException('No tenants exist yet');
        tenantId = first.id;
      } else {
        tenantId = user.tenantId ?? undefined;
      }
    }
    if (!tenantId) {
      throw new BadRequestException('Unable to determine tenant');
    }
    if (user.role !== Role.SUPER_ADMIN && user.tenantId !== tenantId) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (from >= to) {
      throw new BadRequestException('from must be before to');
    }
    return { tenantId, from, to };
  }

  private resolveGranularity(
    granularity: ExecAnalyticsGranularity | undefined,
    from: Date,
    to: Date,
  ): ExecAnalyticsGranularity {
    if (granularity) return granularity;
    const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    return days > 92 ? ExecAnalyticsGranularity.WEEK : ExecAnalyticsGranularity.DAY;
  }

  /**
   * Per-site NPS via the surveys service: for every survey at the site within
   * the window, ask SurveysService.getAnalytics for its NPS score (null when the
   * survey has no NPS answers), then average the non-null scores.
   */
  private async getNpsBySite(
    sites: { id: string; name: string }[],
    from: Date,
    to: Date,
    user: AuthUser,
  ): Promise<Array<{ siteId: string; npsScore: number | null }>> {
    const surveys = await this.prisma.survey.findMany({
      where: {
        tenantId:
          user.role === Role.SUPER_ADMIN ? undefined : (user.tenantId ?? undefined),
        siteId: { in: sites.map((s) => s.id) },
        createdAt: { gte: from, lt: to },
      },
      select: { id: true, siteId: true },
    });
    if (surveys.length === 0) {
      return sites.map((s) => ({ siteId: s.id, npsScore: null }));
    }

    const scoreBySurvey = await Promise.all(
      surveys.map(async (survey) => {
        const result = await this.surveys.getAnalytics(survey.id, {
          tenantId: user.tenantId,
          role: user.role,
        });
        return { surveyId: survey.id, siteId: survey.siteId, nps: result.data.npsScore };
      }),
    );

    const siteMap = new Map<string, { sum: number; count: number }>();
    for (const entry of scoreBySurvey) {
      if (entry.nps == null) continue;
      const acc = siteMap.get(entry.siteId) ?? { sum: 0, count: 0 };
      acc.sum += entry.nps;
      acc.count += 1;
      siteMap.set(entry.siteId, acc);
    }

    return sites.map((s) => {
      const acc = siteMap.get(s.id);
      return { siteId: s.id, npsScore: acc && acc.count > 0 ? this.round(acc.sum / acc.count) : null };
    });
  }

  /**
   * Zero-filled time series of { date, revenue, orders } over [from, to).
   * Day buckets use UTC 'YYYY-MM-DD'; week buckets use ISO week 'YYYY-Www'.
   */
  private buildTrend(
    orders: { createdAt: Date; grandTotal: Prisma.Decimal | number }[],
    from: Date,
    to: Date,
    granularity: ExecAnalyticsGranularity,
  ): Array<{ date: string; revenue: number; orders: number }> {
    const bucket = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const key =
        granularity === ExecAnalyticsGranularity.WEEK
          ? this.isoWeekKey(o.createdAt)
          : o.createdAt.toISOString().slice(0, 10);
      const acc = bucket.get(key) ?? { revenue: 0, orders: 0 };
      acc.revenue += Number(o.grandTotal);
      acc.orders += 1;
      bucket.set(key, acc);
    }

    const series: Array<{ date: string; revenue: number; orders: number }> = [];
    if (granularity === ExecAnalyticsGranularity.WEEK) {
      // Walk forward week by week from the Monday of the start week.
      let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
      cursor = this.startOfIsoWeek(cursor);
      const end = new Date(to);
      let guard = 0;
      while (cursor < end && guard < 420) {
        const key = this.isoWeekKey(cursor);
        const acc = bucket.get(key) ?? { revenue: 0, orders: 0 };
        series.push({
          date: key,
          revenue: this.round(acc.revenue),
          orders: acc.orders,
        });
        cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
        guard += 1;
      }
    } else {
      const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
      const end = new Date(to);
      let guard = 0;
      while (start < end && guard < 420) {
        const key = start.toISOString().slice(0, 10);
        const acc = bucket.get(key) ?? { revenue: 0, orders: 0 };
        series.push({ date: key, revenue: this.round(acc.revenue), orders: acc.orders });
        start.setUTCDate(start.getUTCDate() + 1);
        guard += 1;
      }
    }
    return series;
  }

  private isoWeekKey(d: Date): string {
    const cursor = this.startOfIsoWeek(d);
    const yearStart = new Date(Date.UTC(cursor.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((cursor.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${cursor.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  private startOfIsoWeek(d: Date): Date {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = date.getUTCDay() || 7; // Monday = 1 ... Sunday = 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum); // move to Thursday
    const thursday = new Date(date);
    thursday.setUTCDate(thursday.getUTCDate() - 3); // back to Monday
    return thursday;
  }

  private averageOfNonNull(values: Array<number | null>): number | null {
    const valid = values.filter((v): v is number => v != null);
    if (valid.length === 0) return null;
    return this.round(valid.reduce((s, v) => s + v, 0) / valid.length);
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
