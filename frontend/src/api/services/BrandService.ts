/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_logo_api_brand_logo_post } from '../models/Body_upload_logo_api_brand_logo_post';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BrandService {
    /**
     * Read Brand
     * @returns any Successful Response
     * @throws ApiError
     */
    public static readBrandApiBrandGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/brand',
        });
    }
    /**
     * Write Brand
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static writeBrandApiBrandPut(
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/brand',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Logo
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadLogoApiBrandLogoPost(
        formData: Body_upload_logo_api_brand_logo_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/brand/logo',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
