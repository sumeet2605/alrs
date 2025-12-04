/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddOnRevenue } from './AddOnRevenue';
import type { CfoDashboard } from './CfoDashboard';
import type { ConversionFunnel } from './ConversionFunnel';
import type { LeadSourceStat } from './LeadSourceStat';
import type { MonthlyRevenuePoint } from './MonthlyRevenuePoint';
import type { PackagePerformance } from './PackagePerformance';
export type BusinessDashboard = {
    revenue_monthly: Array<MonthlyRevenuePoint>;
    lead_source_effectiveness: Array<LeadSourceStat>;
    conversion_funnel: ConversionFunnel;
    package_performance: Array<PackagePerformance>;
    addon_revenue_breakdown: Array<AddOnRevenue>;
    cfo_dashboard: CfoDashboard;
};

