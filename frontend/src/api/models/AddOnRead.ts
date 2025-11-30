/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddOnCategory } from './AddOnCategory';
export type AddOnRead = {
    code: string;
    name: string;
    description?: (string | null);
    price: string;
    category: AddOnCategory;
    is_active?: boolean;
    id: number;
    created_at?: (string | null);
    updated_at?: (string | null);
};

