/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddOnCreate } from '../models/AddOnCreate';
import type { AddOnRead } from '../models/AddOnRead';
import type { AddOnUpdate } from '../models/AddOnUpdate';
import type { ClientCreate } from '../models/ClientCreate';
import type { ClientRead } from '../models/ClientRead';
import type { ClientUpdate } from '../models/ClientUpdate';
import type { DashboardSummary } from '../models/DashboardSummary';
import type { InvoiceCreate } from '../models/InvoiceCreate';
import type { InvoiceRead } from '../models/InvoiceRead';
import type { InvoiceStatus } from '../models/InvoiceStatus';
import type { InvoiceUpdate } from '../models/InvoiceUpdate';
import type { LeadCreate } from '../models/LeadCreate';
import type { LeadRead } from '../models/LeadRead';
import type { LeadStage } from '../models/LeadStage';
import type { LeadUpdate } from '../models/LeadUpdate';
import type { PackageCategory } from '../models/PackageCategory';
import type { PackageCreate } from '../models/PackageCreate';
import type { PackageRead } from '../models/PackageRead';
import type { PackageUpdate } from '../models/PackageUpdate';
import type { PaymentCreate } from '../models/PaymentCreate';
import type { PaymentRead } from '../models/PaymentRead';
import type { SessionAddOnItemOut } from '../models/SessionAddOnItemOut';
import type { SessionAddOnUpsert } from '../models/SessionAddOnUpsert';
import type { SessionCreate } from '../models/SessionCreate';
import type { SessionRead } from '../models/SessionRead';
import type { SessionUpdate } from '../models/SessionUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CrmService {
    /**
     * Create Client
     * @param requestBody
     * @returns ClientRead Successful Response
     * @throws ApiError
     */
    public static createClientApiCrmClientsPost(
        requestBody: ClientCreate,
    ): CancelablePromise<ClientRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/crm/clients',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Clients
     * @param q Search by name or phone
     * @param limit
     * @param offset
     * @returns ClientRead Successful Response
     * @throws ApiError
     */
    public static listClientsApiCrmClientsGet(
        q?: (string | null),
        limit: number = 50,
        offset?: number,
    ): CancelablePromise<Array<ClientRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/clients',
            query: {
                'q': q,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Client
     * @param clientId
     * @returns ClientRead Successful Response
     * @throws ApiError
     */
    public static getClientApiCrmClientsClientIdGet(
        clientId: number,
    ): CancelablePromise<ClientRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/clients/{client_id}',
            path: {
                'client_id': clientId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Client
     * @param clientId
     * @param requestBody
     * @returns ClientRead Successful Response
     * @throws ApiError
     */
    public static updateClientApiCrmClientsClientIdPatch(
        clientId: number,
        requestBody: ClientUpdate,
    ): CancelablePromise<ClientRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/crm/clients/{client_id}',
            path: {
                'client_id': clientId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Client
     * @param clientId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteClientApiCrmClientsClientIdDelete(
        clientId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/crm/clients/{client_id}',
            path: {
                'client_id': clientId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Lead
     * @param requestBody
     * @returns LeadRead Successful Response
     * @throws ApiError
     */
    public static createLeadApiCrmLeadsPost(
        requestBody: LeadCreate,
    ): CancelablePromise<LeadRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/crm/leads',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Leads
     * @param stage
     * @param limit
     * @param offset
     * @returns LeadRead Successful Response
     * @throws ApiError
     */
    public static listLeadsApiCrmLeadsGet(
        stage?: (LeadStage | null),
        limit: number = 50,
        offset?: number,
    ): CancelablePromise<Array<LeadRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/leads',
            query: {
                'stage': stage,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Lead
     * @param leadId
     * @returns LeadRead Successful Response
     * @throws ApiError
     */
    public static getLeadApiCrmLeadsLeadIdGet(
        leadId: number,
    ): CancelablePromise<LeadRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/leads/{lead_id}',
            path: {
                'lead_id': leadId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Lead
     * @param leadId
     * @param requestBody
     * @returns LeadRead Successful Response
     * @throws ApiError
     */
    public static updateLeadApiCrmLeadsLeadIdPatch(
        leadId: number,
        requestBody: LeadUpdate,
    ): CancelablePromise<LeadRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/crm/leads/{lead_id}',
            path: {
                'lead_id': leadId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Lead
     * @param leadId
     * @returns void
     * @throws ApiError
     */
    public static deleteLeadApiCrmLeadsLeadIdDelete(
        leadId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/crm/leads/{lead_id}',
            path: {
                'lead_id': leadId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Lead Timeline
     * @param leadId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getLeadTimelineApiCrmLeadsLeadIdTimelineGet(
        leadId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/leads/{lead_id}/timeline',
            path: {
                'lead_id': leadId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Packages
     * @param q Search by name/code
     * @param isActive
     * @param category
     * @returns PackageRead Successful Response
     * @throws ApiError
     */
    public static listPackagesApiCrmPackagesGet(
        q?: (string | null),
        isActive?: (boolean | null),
        category?: (PackageCategory | null),
    ): CancelablePromise<Array<PackageRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/packages',
            query: {
                'q': q,
                'is_active': isActive,
                'category': category,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Package
     * @param requestBody
     * @returns PackageRead Successful Response
     * @throws ApiError
     */
    public static createPackageApiCrmPackagesPost(
        requestBody: PackageCreate,
    ): CancelablePromise<PackageRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/crm/packages',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Package
     * @param packageId
     * @returns PackageRead Successful Response
     * @throws ApiError
     */
    public static getPackageApiCrmPackagesPackageIdGet(
        packageId: number,
    ): CancelablePromise<PackageRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/packages/{package_id}',
            path: {
                'package_id': packageId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Package
     * @param packageId
     * @param requestBody
     * @returns PackageRead Successful Response
     * @throws ApiError
     */
    public static updatePackageApiCrmPackagesPackageIdPatch(
        packageId: number,
        requestBody: PackageUpdate,
    ): CancelablePromise<PackageRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/crm/packages/{package_id}',
            path: {
                'package_id': packageId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Package
     * @param packageId
     * @returns void
     * @throws ApiError
     */
    public static deletePackageApiCrmPackagesPackageIdDelete(
        packageId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/crm/packages/{package_id}',
            path: {
                'package_id': packageId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Session
     * @param requestBody
     * @returns SessionRead Successful Response
     * @throws ApiError
     */
    public static createSessionApiCrmSessionsPost(
        requestBody: SessionCreate,
    ): CancelablePromise<SessionRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/crm/sessions',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Sessions
     * @param limit
     * @param offset
     * @returns SessionRead Successful Response
     * @throws ApiError
     */
    public static listSessionsApiCrmSessionsGet(
        limit: number = 50,
        offset?: number,
    ): CancelablePromise<Array<SessionRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/sessions',
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Session
     * @param sessionId
     * @returns SessionRead Successful Response
     * @throws ApiError
     */
    public static getSessionApiCrmSessionsSessionIdGet(
        sessionId: number,
    ): CancelablePromise<SessionRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/sessions/{session_id}',
            path: {
                'session_id': sessionId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Session
     * @param sessionId
     * @param requestBody
     * @returns SessionRead Successful Response
     * @throws ApiError
     */
    public static updateSessionApiCrmSessionsSessionIdPatch(
        sessionId: number,
        requestBody: SessionUpdate,
    ): CancelablePromise<SessionRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/crm/sessions/{session_id}',
            path: {
                'session_id': sessionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Session Add Ons
     * @param sessionId
     * @returns SessionAddOnItemOut Successful Response
     * @throws ApiError
     */
    public static getSessionAddOnsApiCrmSessionsSessionIdAddOnsGet(
        sessionId: number,
    ): CancelablePromise<Array<SessionAddOnItemOut>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/sessions/{session_id}/add-ons',
            path: {
                'session_id': sessionId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Set Session Add Ons
     * @param sessionId
     * @param requestBody
     * @returns SessionAddOnItemOut Successful Response
     * @throws ApiError
     */
    public static setSessionAddOnsApiCrmSessionsSessionIdAddOnsPut(
        sessionId: number,
        requestBody: SessionAddOnUpsert,
    ): CancelablePromise<Array<SessionAddOnItemOut>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/crm/sessions/{session_id}/add-ons',
            path: {
                'session_id': sessionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Add Ons
     * @param isActive
     * @returns AddOnRead Successful Response
     * @throws ApiError
     */
    public static listAddOnsApiCrmAddOnsGet(
        isActive?: (boolean | null),
    ): CancelablePromise<Array<AddOnRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/add-ons',
            query: {
                'is_active': isActive,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Add On
     * @param requestBody
     * @returns AddOnRead Successful Response
     * @throws ApiError
     */
    public static createAddOnApiCrmAddOnsPost(
        requestBody: AddOnCreate,
    ): CancelablePromise<AddOnRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/crm/add-ons',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Add On
     * @param addOnId
     * @param requestBody
     * @returns AddOnRead Successful Response
     * @throws ApiError
     */
    public static updateAddOnApiCrmAddOnsAddOnIdPatch(
        addOnId: number,
        requestBody: AddOnUpdate,
    ): CancelablePromise<AddOnRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/crm/add-ons/{add_on_id}',
            path: {
                'add_on_id': addOnId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Add On
     * @param addOnId
     * @returns void
     * @throws ApiError
     */
    public static deleteAddOnApiCrmAddOnsAddOnIdDelete(
        addOnId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/crm/add-ons/{add_on_id}',
            path: {
                'add_on_id': addOnId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Dashboard Summary
     * @returns DashboardSummary Successful Response
     * @throws ApiError
     */
    public static getDashboardSummaryApiCrmDashboardSummaryGet(): CancelablePromise<DashboardSummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/dashboard/summary',
        });
    }
    /**
     * Create Invoice For Session
     * @param sessionId
     * @param requestBody
     * @returns InvoiceRead Successful Response
     * @throws ApiError
     */
    public static createInvoiceForSessionApiCrmSessionsSessionIdInvoicePost(
        sessionId: number,
        requestBody: InvoiceCreate,
    ): CancelablePromise<InvoiceRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/crm/sessions/{session_id}/invoice',
            path: {
                'session_id': sessionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Invoices
     * @param status
     * @param clientId
     * @param sessionId
     * @returns InvoiceRead Successful Response
     * @throws ApiError
     */
    public static listInvoicesApiCrmInvoicesGet(
        status?: (InvoiceStatus | null),
        clientId?: (number | null),
        sessionId?: (number | null),
    ): CancelablePromise<Array<InvoiceRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/invoices',
            query: {
                'status': status,
                'client_id': clientId,
                'session_id': sessionId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Invoice
     * @param invoiceId
     * @param requestBody
     * @returns InvoiceRead Successful Response
     * @throws ApiError
     */
    public static updateInvoiceApiCrmInvoicesInvoiceIdPatch(
        invoiceId: number,
        requestBody: InvoiceUpdate,
    ): CancelablePromise<InvoiceRead> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/crm/invoices/{invoice_id}',
            path: {
                'invoice_id': invoiceId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Invoice
     * @param invoiceId
     * @returns void
     * @throws ApiError
     */
    public static deleteInvoiceApiCrmInvoicesInvoiceIdDelete(
        invoiceId: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/crm/invoices/{invoice_id}',
            path: {
                'invoice_id': invoiceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Add Payment
     * @param invoiceId
     * @param requestBody
     * @returns PaymentRead Successful Response
     * @throws ApiError
     */
    public static addPaymentApiCrmInvoicesInvoiceIdPaymentsPost(
        invoiceId: number,
        requestBody: PaymentCreate,
    ): CancelablePromise<PaymentRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/crm/invoices/{invoice_id}/payments',
            path: {
                'invoice_id': invoiceId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Payments For Invoice
     * @param invoiceId
     * @returns PaymentRead Successful Response
     * @throws ApiError
     */
    public static listPaymentsForInvoiceApiCrmInvoicesInvoiceIdPaymentsGet(
        invoiceId: number,
    ): CancelablePromise<Array<PaymentRead>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/crm/invoices/{invoice_id}/payments',
            path: {
                'invoice_id': invoiceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
