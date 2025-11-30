/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddOnCategory } from './AddOnCategory';
export type AddOnCreate = {
    code: string;
    name: string;
    description?: (string | null);
    price: (number | string);
    category: AddOnCategory;
    is_active?: boolean;
};

