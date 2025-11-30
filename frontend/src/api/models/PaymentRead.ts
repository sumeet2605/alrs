/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaymentGateway } from './PaymentGateway';
import type { PaymentStatus } from './PaymentStatus';
import type { PaymentType } from './PaymentType';
export type PaymentRead = {
    id: number;
    invoice_id: number;
    session_id: number;
    amount: string;
    currency?: (string | null);
    status: PaymentStatus;
    type: PaymentType;
    gateway: PaymentGateway;
    gateway_ref: (string | null);
    paid_at: (string | null);
    created_at: (string | null);
    updated_at: (string | null);
};

