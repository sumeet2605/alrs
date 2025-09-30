/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_photos_api_galleries__gallery_id__photos_post } from '../models/Body_upload_photos_api_galleries__gallery_id__photos_post';
import type { GalleryCreate } from '../models/GalleryCreate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
import axios from 'axios';
import type { AxiosProgressEvent } from 'axios';
export class GalleryService {
    /**
     * List Galleries
     * @returns any Successful Response
     * @throws ApiError
     */
    public static listGalleriesApiGalleriesGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/galleries',
        });
    }
    /**
     * Create Gallery
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static createGalleryApiGalleriesPost(
        requestBody: GalleryCreate,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/galleries',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Photos
     * @param galleryId
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadPhotosApiGalleriesGalleryIdPhotosPost(
        galleryId: string,
        formData: Body_upload_photos_api_galleries__gallery_id__photos_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/galleries/{gallery_id}/photos',
            path: {
                'gallery_id': galleryId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Upload Photos using raw FormData (keeps multipart boundary and supports progress)
     *
     * Use this method when you have a browser FormData instance and want upload progress,
     * or when the generated client doesn't serialize FormData correctly.
     *
     * Example:
     *   const fd = new FormData();
     *   files.forEach(f => fd.append('files', f));
     *   await GalleryService.uploadPhotosFormData(galleryId, fd, {
     *     onUploadProgress: (e) => { ... },
     *     withCredentials: true
     *   });
     *
     * - galleryId: the gallery id
     * - formData: a native FormData instance (append with key 'files')
     * - opts:
     *    - onUploadProgress: optional callback (ProgressEvent)
     *    - withCredentials: optional boolean (defaults to OpenAPI.WITH_CREDENTIALS or false)
     *    - headers: optional headers object to merge (e.g. { Authorization: 'Bearer ...' })
     */
    public static async uploadPhotosFormData(
        galleryId: string,
        formData: FormData,
        opts?: {
            onUploadProgress?: (progressEvent?: AxiosProgressEvent) => void;
            withCredentials?: boolean;
            headers?: Record<string, string>;
        }
    ): Promise<any> {
        const base = (OpenAPI.BASE ?? '').replace(/\/$/, '');
        const url = `${base}/api/galleries/${encodeURIComponent(galleryId)}/photos`;

        const headers: Record<string, string> = {
            ...(opts?.headers ?? {}),
        };

        // If OpenAPI.TOKEN is set and caller didn't override Authorization, use it
        if (OpenAPI.TOKEN && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${OpenAPI.TOKEN}`;
        }

        const resp = await axios.post(url, formData, {
            headers, // don't set Content-Type here — axios/browser will set boundary
            withCredentials: typeof opts?.withCredentials === 'boolean' ? opts!.withCredentials : !!OpenAPI.WITH_CREDENTIALS,
            onUploadProgress: opts?.onUploadProgress,
        });

        return resp.data;
    }

    /**
     * List Photos
     * @param galleryId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static listPhotosApiGalleriesGalleryIdPhotosGet(
        galleryId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/galleries/{gallery_id}/photos',
            path: {
                'gallery_id': galleryId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Set Gallery Password Endpoint
     * Owner-only endpoint to set or remove a password for a gallery.
     * payload: { "password": "..." }  or { "password": null } to remove
     * @param galleryId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static setGalleryPasswordEndpointApiGalleriesGalleryIdPasswordPost(
        galleryId: string,
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/galleries/{gallery_id}/password',
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
     * Unlock Gallery Endpoint
     * Client submits { "password": "..." }. If correct, server sets a short-lived cookie to allow access.
     * Returns {"ok": True} on success.
     * Cookie name: gallery_access_{gallery_id}
     * @param galleryId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static unlockGalleryEndpointApiGalleriesGalleryIdUnlockPost(
        galleryId: string,
        requestBody: Record<string, any>,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/galleries/{gallery_id}/unlock',
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
    * Delete Photo         
    * @param galleryId
    * @param photoId
    * @returns void
    * @throws ApiError
    */
    public static deletePhotoApiGalleriesGalleryIdPhotosPhotoIdDelete(
        galleryId: string,
        photoId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/galleries/{gallery_id}/photos/{photo_id}',
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
     * Set Photo As Cover
     * Set a photo as the gallery cover. This will:
     * - validate gallery/photo ownership
     * - unset any other photo.is_cover in the gallery
     * - set this photo.is_cover = True
     * - optionally update gallery.cover_photo_id (if you added that column)
     * @param galleryId
     * @param photoId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static setPhotoAsCoverApiGalleriesGalleryIdPhotosPhotoIdCoverPost(
        galleryId: string,
        photoId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/galleries/{gallery_id}/photos/{photo_id}/cover',
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
     * Download Gallery Route
     * Wrapper route that calls the download helper in app.gallery.download.
     * @param galleryId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static downloadGalleryRouteApiGalleriesGalleryIdDownloadGet(
        galleryId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/galleries/{gallery_id}/download',
            path: {
                'gallery_id': galleryId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Gallery
     * @param galleryId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getGalleryApiGalleriesGalleryIdGet(
        galleryId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/galleries/{gallery_id}',
            path: {
                'gallery_id': galleryId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
