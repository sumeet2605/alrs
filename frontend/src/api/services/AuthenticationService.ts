/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_user_login_api_login_post } from '../models/Body_user_login_api_login_post';
import type { ChangePasswordRequest } from '../models/ChangePasswordRequest';
import type { Token } from '../models/Token';
import type { UserResponse } from '../models/UserResponse';
import type { ForgotPasswordRequest } from '../models/ForgotPasswordRequest';
import type { ResetPasswordRequest } from '../models/ResetPasswordRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * User Login
     * Handles user login, verifies credentials, and returns a JWT access token.
     * @param formData
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static userLoginApiLoginPost(
        formData: Body_user_login_api_login_post,
    ): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/login',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Refresh Access Token
     * Exchanges a valid refresh token for a new access token and refresh token.
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static refreshTokenApiRefreshPost(): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/refresh',
        });
    }
    /**
     * Get Current User
     * Retrieves the currently authenticated user's information based on the provided JWT.
     * @returns UserResponse Successful Response
     * @throws ApiError
     */
    public static getCurrentUserApiMeGet(): CancelablePromise<UserResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/me',
        });
    }
    /**
     * Change user password
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static changePasswordApiChangePasswordPost(
        requestBody: ChangePasswordRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/change-password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Forgot Password
     * Sends a password reset link to the user's email.
     * @param data
     * @returns object Successful Response
     * @throws ApiError
     */
    public static forgotPasswordApiForgotPasswordPost(
        data: ForgotPasswordRequest,
    ): CancelablePromise<{ message: string }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/forgot-password',
            body: data,
            mediaType: 'application/json',
        });
    }
    /**
     * Reset Password
     * Resets the user's password using a token.
     * @param data
     * @returns object Successful Response
     * @throws ApiError
     */
    public static resetPasswordApiResetPasswordPost(
        data: ResetPasswordRequest,
    ): CancelablePromise<{ message: string }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/reset-password',
            body: data,
            mediaType: 'application/json',
        });
    }
}
