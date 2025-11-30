/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaymentGateway } from './PaymentGateway';
import type { PaymentStatus } from './PaymentStatus';
import type { PaymentType } from './PaymentType';
export type PaymentCreate = {
    invoice_id: number;
    amount: (number | string);
    currency?: (string | null);
    status?: (PaymentStatus | null);
    type?: (PaymentType | null);
    gateway?: (PaymentGateway | null);
    gateway_ref?: (string | null);
    paid_at?: (string | null);
};

