/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LocationType } from './LocationType';
import type { SessionStatus } from './SessionStatus';
export type SessionUpdate = {
    package_id: number;
    status?: (SessionStatus | null);
    scheduled_start?: (string | null);
    scheduled_end?: (string | null);
    location_type?: (LocationType | null);
    location_address?: (string | null);
    total_price?: (number | null);
    gallery_ids?: (Array<number> | null);
    discount_amount?: (number | null);
    final_price?: (number | null);
    notes_photographer?: (string | null);
    notes_client_visible?: (string | null);
};

