/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RoleResponse } from './RoleResponse';
/**
 * Pydantic model for user data in API responses.
 */
export type UserResponse = {
    username: string;
    email: string;
    full_name: (string | null);
    is_active: boolean;
    role: RoleResponse;
};

