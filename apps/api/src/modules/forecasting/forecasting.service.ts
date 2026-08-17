import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@omniops/shared';
import { Prisma } from '@prisma/client';
import { ForecastingQueryDto } from './dto/forecasting-query.dto';

type AuthUser = { tenantId: string | null; role: Role; siteId?: string | null; id: string };

/**
 * DEMAND FORECASTING — statistical, deterministic, explainable.
 *
 * "AI-assisted" here means a real forecasting model implemented in the service
 * (no external API is available). The model is a classical decomposition:
 *
 *   forecast(t) = weekdayFactor(weekday(t)) × recentLevel + dampenedTrend(t)
 *
 * 1. BASE SERIES — daily revenue/orders from Orders where status NOT IN
 *    ('CANCELLED','REFUNDED') — the exact revenue definition used by the
 *    analytics / exec-analytics modules — grouped by UTC day and zero-filled
 *    over the trailing HISTORY_DAYS (60) calendar days ending end-of-today.
 * 2. DAY-OF-WEEK SEASONALITY — mean value per weekday over the zero-filled
 *    series, normalized so the average factor = 1 (clamped to [0.33, 3] to
 *    keep a single sparse day from dominating). Only enabled when there are
 *    >= SEASONALITY_MIN_CALENDAR_DAYS calendar days AND >= 14 days WITH
 *    recorded orders; otherwise factors are flat 1.0 (fall back to the
 *    overall average, per the spec's "< 2 weeks → fall back" rule).
 * 3. TREND — simple linear regression (least squares) slope over the series,
 *    DAMPENED by ×0.5 so it cannot run away over a 30-day horizon.
 * 4. RECENT LEVEL — mean of the trailing 7 days (or the whole series when
 *    shorter). This is the "level" the seasonal factors multiply.
 * 5. FORECAST — for each of the next `horizon` days (starting tomorrow):
 *        value = max(0, weekdayFactor × level + dampenedSlope × k)
 *    where k = 1..horizon is the day offset. Bounds:
 *        bound = 1.5 × population std dev of the historical daily series
 *                (or ±20% of the forecast when std dev ≈ 0)
 *        lower = max(0, value - bound), upper = value + bound   (≥ value)
 *    Both forecast and bounds are clamped ≥ 0.
 * 6. ORDER FORECAST — the same pipeline is run on the daily order-count
 *    series (same seasonality/trend/level), rounded to 1 decimal. Order
 *    counts and revenue therefore share the same method; avgCheck implied by
 *    revenue/orders stays coherent. Only revenue gets lower/upper bounds.
 * 7. MAPE (meta) — in-sample mean absolute percentage error of the fitted
 *    model over days with revenue > 0 (capped at 100%/day); null when no
 *    non-zero day exists. This is a fit-quality indicator, not a guarantee.
 *
 * If the site has no qualifying orders in the window the endpoint still
 * returns 200 with an empty `historical`, a zero `forecast` of horizon
 * length, and a clear "insufficient data" meta note.
 */
@Injectable()
export class ForecastingService {
  constructor(private prisma: PrismaService) {}

  async getDemand(query: ForecastingQueryDto, user: AuthUser) {
    const site = await this.resolveSite(query.siteId, user);
    const horizon = query.horizon ?? 14;

    const now = new Date();
    // History window: 60 calendar days ending at the END of today (UTC), so
    // today's (partial) orders are included — consistent with exec-analytics.
    const historyEnd = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + DAY_MS;
    const historyStart = historyEnd - HISTORY_DAYS * DAY_MS;

    const orders = await this.prisma.order.findMany({
      where: {
        siteId: site.id,
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        createdAt: { gte: new Date(historyStart), lt: new Date(historyEnd) },
      },
      select: { createdAt: true, grandTotal: true },
      orderBy: { createdAt: 'asc' },
    });

    const notes: string[] = [
      'Method: day-of-week seasonality + dampened linear trend (deterministic statistical model).',
    ];

    if (orders.length === 0) {
      notes.push(
        'Insufficient data — no qualifying orders in the last 60 days; forecast is zero. Historical revenue will appear as orders come in.',
      );
      return {
        success: true,
        data: {
          siteId: site.id,
          method: 'weekday-seasonality-trend',
          generatedAt: now.toISOString(),
          horizon,
          historical: [],
          forecast: this.zeroForecast(horizon, historyEnd),
          meta: { historyDays: 0, mape: null, trend: 0, notes },
        },
      };
    }

    const series = this.buildDailySeries(orders, new Date(historyStart), new Date(historyEnd));
    const historyDays = series.length;
    const activeDays = series.filter((d) => d.revenue > 0 || d.orders > 0).length;

    // Seasonality gate: need ~2 weeks of calendar history AND ~2 weeks of
    // days with actual orders, otherwise the weekday factors are noise.
    const useSeasonality =
      historyDays >= SEASONALITY_MIN_CALENDAR_DAYS && activeDays >= SEASONALITY_MIN_ACTIVE_DAYS;
    if (!useSeasonality) {
      notes.push(
        `Limited history (${historyDays} calendar days, ${activeDays} with orders) — weekday seasonality disabled; treat forecast as indicative.`,
      );
    } else {
      notes.push(`Day-of-week seasonality estimated from ${activeDays} active days of history.`);
    }

    const dates = series.map((d) => d.date);
    const revenueFit = this.fitSeries(series.map((d) => d.revenue), dates, useSeasonality);
    const orderFit = this.fitSeries(series.map((d) => d.orders), dates, useSeasonality);

    const revenueProj = this.projectSeries(revenueFit, horizon, historyEnd, this.round2);
    const orderProj = this.projectSeries(orderFit, horizon, historyEnd, this.round1);

    const forecast = revenueProj.map((p, i) => ({
      date: p.date,
      revenue: p.value,
      orders: orderProj[i]?.value ?? 0,
      lower: p.lower,
      upper: p.upper,
    }));

    if (Math.abs(revenueFit.slope) >= 0.005 && activeDays >= 4) {
      const dir = revenueFit.slope > 0 ? 'up' : 'down';
      notes.push(
        `Revenue trending ${dir} by ~$${Math.abs(revenueFit.slope).toFixed(2)}/day (dampened ×${TREND_DAMPENING}).`,
      );
    }
    if (revenueFit.std > 1e-9) {
      notes.push(
        `Confidence bounds: ±${this.round2(BOUND_STDDEV_MULTIPLIER * revenueFit.std)} (1.5 × historical daily std dev).`,
      );
    } else {
      notes.push('Confidence bounds: ±20% of forecast (historical variance near zero).');
    }

    return {
      success: true,
      data: {
        siteId: site.id,
        method: 'weekday-seasonality-trend',
        generatedAt: now.toISOString(),
        horizon,
        historical: series,
        forecast,
        meta: {
          historyDays,
          mape: this.inSampleMape(series, revenueFit, useSeasonality),
          trend: this.round2(revenueFit.slope),
          notes,
        },
      },
    };
  }

  // ══════════════════════════════════════════════════
  // MODEL
  // ══════════════════════════════════════════════════

  private fitSeries(values: number[], dates: string[], useSeasonality: boolean) {
    const n = values.length;
    const overallMean = n ? values.reduce((s, v) => s + v, 0) / n : 0;

    // Recent level = mean of the trailing RECENT_WINDOW_DAYS days.
    const recent = values.slice(Math.max(0, n - RECENT_WINDOW_DAYS));
    const level = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : overallMean;

    // Day-of-week seasonality factors (index 0 = Sunday, matching getUTCDay).
    let factors = [1, 1, 1, 1, 1, 1, 1];
    if (useSeasonality) {
      const sums = [0, 0, 0, 0, 0, 0, 0];
      const counts = [0, 0, 0, 0, 0, 0, 0];
      values.forEach((v, i) => {
        const wd = new Date(`${dates[i]}T00:00:00Z`).getUTCDay();
        sums[wd] = (sums[wd] ?? 0) + v;
        counts[wd] = (counts[wd] ?? 0) + 1;
      });
      const wdMeans = sums.map((s, wd) =>
        (counts[wd] ?? 0) > 0 ? s / (counts[wd] ?? 1) : overallMean,
      );
      const baseMean = wdMeans.reduce((a, b) => a + b, 0) / 7;
      if (baseMean > 0) {
        factors = wdMeans.map((m) => Math.min(3, Math.max(1 / 3, m / baseMean)));
      }
    }

    // Linear regression slope over day indices, then dampened.
    const meanIdx = (n - 1) / 2;
    let num = 0;
    let den = 0;
    values.forEach((v, i) => {
      const dx = i - meanIdx;
      num += dx * (v - overallMean);
      den += dx * dx;
    });
    const rawSlope = den > 0 ? num / den : 0;
    const slope = rawSlope * TREND_DAMPENING;

    // Population std dev of the daily series (zeros included — a quiet day is
    // just as informative as a busy one for confidence).
    const std = Math.sqrt(values.reduce((s, v) => s + (v - overallMean) ** 2, 0) / n);

    return { level, factors, slope, std, overallMean };
  }

  private projectSeries(
    fit: { level: number; factors: number[]; slope: number; std: number },
    horizon: number,
    historyEndMs: number,
    round: (v: number) => number,
  ): Array<{ date: string; value: number; lower: number; upper: number }> {
    const points: Array<{ date: string; value: number; lower: number; upper: number }> = [];
    for (let k = 1; k <= horizon; k++) {
      const date = new Date(historyEndMs + (k - 1) * DAY_MS);
      const wd = date.getUTCDay();
      const value = Math.max(0, (fit.factors[wd] ?? 1) * fit.level + fit.slope * k);
      const bound =
        fit.std > 1e-9
          ? BOUND_STDDEV_MULTIPLIER * fit.std
          : BOUND_MIN_FRACTION * value; // ±20% fallback when std dev ≈ 0
      const lower = Math.max(0, value - bound);
      const upper = value + bound;
      points.push({
        date: date.toISOString().slice(0, 10),
        value: round(value),
        lower: round(lower),
        upper: round(upper),
      });
    }
    return points;
  }

  /** In-sample MAPE (%) over days with revenue > 0; null when none. */
  private inSampleMape(
    series: Array<{ date: string; revenue: number }>,
    fit: { factors: number[]; slope: number; overallMean: number },
    useSeasonality: boolean,
  ): number | null {
    const meanIdx = (series.length - 1) / 2;
    const errors: number[] = [];
    series.forEach((d, i) => {
      if (d.revenue <= 0) return;
      const wd = new Date(`${d.date}T00:00:00Z`).getUTCDay();
      const fitted =
        (useSeasonality ? (fit.factors[wd] ?? 1) : 1) * fit.overallMean +
        fit.slope * (i - meanIdx);
      const ape = Math.abs(d.revenue - fitted) / d.revenue;
      errors.push(Math.min(1, ape));
    });
    if (errors.length === 0) return null;
    return this.round1((errors.reduce((a, b) => a + b, 0) / errors.length) * 100);
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════

  private async resolveSite(siteId: string | undefined, user: AuthUser) {
    if (!siteId && user.siteId) {
      siteId = user.siteId;
    }
    if (!siteId) {
      throw new BadRequestException('siteId is required');
    }
    const where: Prisma.SiteWhereInput = { id: siteId };
    if (user.role !== Role.SUPER_ADMIN && user.tenantId) {
      where.tenantId = user.tenantId;
    }
    const site = await this.prisma.site.findFirst({ where });
    if (!site) {
      throw new BadRequestException('Site not found');
    }
    return site;
  }

  /** Zero-filled daily series of { date, revenue, orders } over [from, to). */
  private buildDailySeries(
    orders: Array<{ createdAt: Date; grandTotal: Prisma.Decimal | number }>,
    from: Date,
    to: Date,
  ): Array<{ date: string; revenue: number; orders: number }> {
    const bucket = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const acc = bucket.get(key) ?? { revenue: 0, orders: 0 };
      acc.revenue += Number(o.grandTotal);
      acc.orders += 1;
      bucket.set(key, acc);
    }
    const series: Array<{ date: string; revenue: number; orders: number }> = [];
    const cursor = new Date(from);
    let guard = 0;
    while (cursor < to && guard < HISTORY_DAYS + 2) {
      const key = cursor.toISOString().slice(0, 10);
      const acc = bucket.get(key) ?? { revenue: 0, orders: 0 };
      series.push({ date: key, revenue: this.round2(acc.revenue), orders: acc.orders });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      guard += 1;
    }
    return series;
  }

  private zeroForecast(horizon: number, historyEndMs: number) {
    const forecast: Array<{
      date: string;
      revenue: number;
      orders: number;
      lower: number;
      upper: number;
    }> = [];
    for (let k = 0; k < horizon; k++) {
      forecast.push({
        date: new Date(historyEndMs + k * DAY_MS).toISOString().slice(0, 10),
        revenue: 0,
        orders: 0,
        lower: 0,
        upper: 0,
      });
    }
    return forecast;
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private round1(n: number): number {
    return Math.round(n * 10) / 10;
  }
}

const HISTORY_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 7;
const SEASONALITY_MIN_CALENDAR_DAYS = 14;
const SEASONALITY_MIN_ACTIVE_DAYS = 14;
const TREND_DAMPENING = 0.5;
const BOUND_STDDEV_MULTIPLIER = 1.5;
const BOUND_MIN_FRACTION = 0.2;
