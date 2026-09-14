# Cloudinary migration

Prepared for the free Image and Video account. No paid plan or automatic billing should be enabled.

## Deployment order

1. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend Production environment variables. Store the secret as sensitive; never commit it.
2. Deploy backend and verify authenticated POST /api/media/sign; unauthenticated calls must return 401.
3. Deploy frontend with js/cloudinary-upload.js and updated CSP.
4. Upload an image and video, verify CDN delivery, playlist synchronization and TV playback.

The application accepts images up to 10 MB and videos up to 100 MB; the provider's account limits still apply. SVG and arbitrary files are not accepted by the signed allowed_formats parameter. Secrets stay in the backend.

## Existing playlist

Old Blob URLs remain unchanged until originals can be uploaded and verified. The old Blob store currently returns HTTP 403 because of its transfer quota. Do not delete the library or old files. When migrating, replace only src and source of each verified matching library item, preserving media IDs, playlist IDs, item order, durations and TV codes. Back up server state before replacement. Ambiguous filename matches require inspection.

## Continuous operation

Cloudinary Free has shared monthly credits and is not unlimited. The current TV cache stores playlist metadata, not a guaranteed offline copy of all media. Persistent media caching and testing on the actual TV remain necessary to reduce repeated traffic. Browser storage can be limited or evicted. Device sleep and fullscreen exit are controlled partly by the TV browser.
