/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserRegistration } from '../models/UserRegistration';
import type { UserResponse } from '../models/UserResponse';
import type { RoleResponse } from '../models/RoleResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * Register a new user
     * Handles user registration by validating input and creating a new user.
     * - **email**: The user's email address.
     * - **password**: A strong password that meets complexity rules.
     * @param requestBody
     * @returns any User successfully registered.
     * @throws ApiError
     */
    public static registerUserApiRegisterPost(
        requestBody: UserRegistration,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List all users
     * Retrieves a list of all registered users.
     * This endpoint is restricted to authenticated 'Owner' users.
     * @returns UserResponse Successful Response
     * @throws ApiError
     */
    public static listAllUsersApiUsersGet(): CancelablePromise<Array<UserResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users',
        });
    }

    /**
     * List all users
     * @returns RoleResponse Successful Response
     * @throws ApiError
     */
    public static listAllRolesApiRolesGet(): CancelablePromise<Array<RoleResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/roles',
        });
    }
}
