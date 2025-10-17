/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FavoritesService {
    /**
     * Get Favorites
     * @param galleryId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getFavoritesApiGalleriesGalleryIdFavoritesGet(
        galleryId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/galleries/{gallery_id}/favorites',
            path: {
                'gallery_id': galleryId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Add Favorite
     * @param galleryId
     * @param photoId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static addFavoriteApiGalleriesGalleryIdFavoritesPhotoIdPost(
        galleryId: number,
        photoId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/galleries/{gallery_id}/favorites/{photo_id}',
            path: {
                'gallery_id': galleryId,
                'photo_id': photoId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Remove Favorite
     * @param galleryId
     * @param photoId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static removeFavoriteApiGalleriesGalleryIdFavoritesPhotoIdDelete(
        galleryId: number,
        photoId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/galleries/{gallery_id}/favorites/{photo_id}',
            path: {
                'gallery_id': galleryId,
                'photo_id': photoId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Set Favorites Limit
     * @param galleryId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static setFavoritesLimitApiGalleriesGalleryIdFavoritesLimitPut(
        galleryId: number,
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/galleries/{gallery_id}/favorites/limit',
            path: {
                'gallery_id': galleryId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Favorites Limit
     * @param galleryId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getFavoritesLimitApiGalleriesGalleryIdFavoritesLimitGet(
        galleryId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/galleries/{gallery_id}/favorites/limit',
            path: {
                'gallery_id': galleryId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Export Favorites Csv
     * Export favorites for a gallery as CSV (owner-only).
     * CSV columns: photo_id, filename, order_index, is_cover, added_at (if available)
     * @param galleryId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static exportFavoritesCsvApiGalleriesGalleriesGalleryIdFavoritesExportGet(
        galleryId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/galleries/galleries/{gallery_id}/favorites/export',
            path: {
                'gallery_id': galleryId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
