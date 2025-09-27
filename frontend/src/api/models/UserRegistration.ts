/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Pydantic model for user registration data.
 */
export type UserRegistration = {
    /**
     * Unique username for the user.
     */
    username: string;
    email: string;
    /**
     * Optional full name of the user.
     */
    full_name?: (string | null);
    /**
     * Password must meet complexity rules.
     */
    password: string;
    /**
     * Role of the user, defaults to 'Client'.
     */
    role?: string;
};

