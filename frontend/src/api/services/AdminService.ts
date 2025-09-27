/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PermissionBulkCreate } from '../models/PermissionBulkCreate';
import type { RoleBulkCreate } from '../models/RoleBulkCreate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminService {
    /**
     * Bulk Create Roles
     * Bulk creates a list of roles.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static bulkCreateRolesApiAdminRolesBulkPost(
        requestBody: Array<RoleBulkCreate>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/roles/bulk',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bulk Create Permissions
     * Bulk creates a list of permissions.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static bulkCreatePermissionsApiAdminPermissionsBulkPost(
        requestBody: Array<PermissionBulkCreate>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/admin/permissions/bulk',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
