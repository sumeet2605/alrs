/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BudgetBand } from './BudgetBand';
import type { LeadSource } from './LeadSource';
import type { LeadStage } from './LeadStage';
import type { LeadType } from './LeadType';
import type { LocationType } from './LocationType';
export type LeadUpdate = {
    primary_contact_name?: (string | null);
    primary_contact_phone?: (string | null);
    primary_contact_email?: (string | null);
    lead_type?: (LeadType | null);
    source?: (LeadSource | null);
    source_details?: (string | null);
    stage?: (LeadStage | null);
    status_reason?: (string | null);
    preferred_month?: (string | null);
    location_type_pref?: (LocationType | null);
    location_area_pref?: (string | null);
    budget_band?: (BudgetBand | null);
    priority_score?: (number | null);
    is_pregnant?: (boolean | null);
    due_date?: (string | null);
    gestation_weeks?: (number | null);
    baby_dob?: (string | null);
    baby_age_days?: (number | null);
    baby_age_weeks?: (number | null);
};

