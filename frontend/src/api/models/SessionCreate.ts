/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LocationType } from './LocationType';
import type { SessionStatus } from './SessionStatus';
import type { SessionType } from './SessionType';
export type SessionCreate = {
    lead_id: number;
    client_id: number;
    package_id: number;
    session_type: SessionType;
    status?: (SessionStatus | null);
    scheduled_start?: (string | null);
    scheduled_end?: (string | null);
    location_type: LocationType;
    location_address?: (string | null);
    total_price?: (number | null);
    discount_amount?: (number | null);
    final_price?: (number | null);
    notes_photographer?: (string | null);
    notes_client_visible?: (string | null);
};

