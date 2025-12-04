/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FunnelMetrics } from './FunnelMetrics';
import type { GstSummary } from './GstSummary';
import type { LeadSourceItem } from './LeadSourceItem';
import type { MonthlyRevenueItem } from './MonthlyRevenueItem';
export type BusinessDashboardResponse = {
    revenue_monthly: Array<MonthlyRevenueItem>;
    lead_sources: Array<LeadSourceItem>;
    funnel: FunnelMetrics;
    gst_summary: GstSummary;
};

