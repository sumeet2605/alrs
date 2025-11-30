/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class WhatsappWebhookService {
    /**
     * Verify Whatsapp Webhook
     * Meta (WhatsApp) calls this when you first set up the webhook.
     * You must echo back hub.challenge if verify_token matches.
     * @param hubMode
     * @param hubVerifyToken
     * @param hubChallenge
     * @returns any Successful Response
     * @throws ApiError
     */
    public static verifyWhatsappWebhookWebhooksWhatsappGet(
        hubMode?: (string | null),
        hubVerifyToken?: (string | null),
        hubChallenge?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/webhooks/whatsapp',
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
     * Receive Whatsapp Webhook
     * Receives inbound WhatsApp messages via Meta Webhooks.
     * We:
     * - Extract sender phone, name, conversation id and message text
     * - Call orchestrator.handle_incoming_message
     * - Return 200 OK so Meta knows we processed it
     * @returns any Successful Response
     * @throws ApiError
     */
    public static receiveWhatsappWebhookWebhooksWhatsappPost(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/webhooks/whatsapp',
        });
    }
}
