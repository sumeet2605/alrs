/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LeadStageCount } from './LeadStageCount';
import type { SourceCount } from './SourceCount';
export type DashboardSummary = {
    total_leads: number;
    total_clients: number;
    total_sessions: number;
    total_invoices: number;
    leads_by_stage: Array<LeadStageCount>;
    leads_by_source: Array<SourceCount>;
    revenue_last_30_days: string;
    paid_last_30_days: string;
    upcoming_sessions: number;
};

