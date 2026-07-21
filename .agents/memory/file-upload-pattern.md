---
name: File upload pattern
description: How to handle multipart file uploads in the OpenAPI-first monorepo — spec, codegen, backend, and frontend approach.
---

## Rule
Do NOT put a multipart/form-data `requestBody` in the OpenAPI spec for upload endpoints.

**Why:** Orval generates `zod.instanceof(File)` and `Blob` types which are DOM-only and fail `tsc --build` in the Node.js lib context (no DOM lib). The generated Zod schema also collides with the operation name.

## How to apply
- In openapi.yaml: omit `requestBody` from POST /uploads; add a comment that the client calls it directly with FormData.
- Backend: use `multer` for disk storage; serve static files via `express.static` at `/api/uploads/files/`.
- Frontend: write a `uploadFile(projectId, file)` helper that uses `fetch` + `FormData` directly with the `af_token` from localStorage. Do NOT use the generated `useUploadFile` hook for actual uploading.
- After upload success: manually invalidate `getListUploadsQueryKey` via `queryClient.invalidateQueries`.
