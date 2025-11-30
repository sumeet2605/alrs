/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PackageCategory } from './PackageCategory';
/**
 * Partial update of a package.
 */
export type PackageUpdate = {
    code?: (string | null);
    name?: (string | null);
    category?: (PackageCategory | null);
    description?: (string | null);
    base_price?: (number | string | null);
    currency?: (string | null);
    duration_minutes?: (number | null);
    num_edited_photos?: (number | null);
    num_outfits?: (number | null);
    includes_album?: (boolean | null);
    includes_prints?: (boolean | null);
    is_active?: (boolean | null);
    display_order?: (number | null);
};

