/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InvoiceStatus } from './InvoiceStatus';
export type InvoiceRead = {
    id: number;
    session_id: number;
    invoice_number: string;
    total_amount: string;
    currency?: (string | null);
    status: InvoiceStatus;
    issued_at: (string | null);
    due_at: (string | null);
    created_at: (string | null);
    updated_at: (string | null);
};

