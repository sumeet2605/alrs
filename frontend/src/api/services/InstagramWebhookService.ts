/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class InstagramWebhookService {
    /**
     * Verify Instagram Webhook
     * Meta calls this when you set up the Instagram webhook.
     * Echo back hub.challenge if verify_token matches.
     * @param hubMode
     * @param hubVerifyToken
     * @param hubChallenge
     * @returns any Successful Response
     * @throws ApiError
     */
    public static verifyInstagramWebhookWebhooksInstagramGet(
        hubMode?: (string | null),
        hubVerifyToken?: (string | null),
        hubChallenge?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/webhooks/instagram',
            query: {
                'hub.mode': hubMode,
                'hub.verify_token': hubVerifyToken,
                'hub.challenge': hubChallenge,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Receive Instagram Webhook
     * Receives inbound Instagram DMs via Meta Webhooks.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static receiveInstagramWebhookWebhooksInstagramPost(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/webhooks/instagram',
        });
    }
}
