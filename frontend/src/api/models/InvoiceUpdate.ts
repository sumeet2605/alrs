/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InvoiceStatus } from './InvoiceStatus';
export type InvoiceUpdate = {
    total_amount?: (number | string | null);
    currency?: (string | null);
    status?: (InvoiceStatus | null);
    issued_at?: (string | null);
    due_at?: (string | null);
};

