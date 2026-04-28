// Shared validation regex for CMS-uploaded media paths. Single source of
// truth used by the Zod schema (src/content.config.ts) and the prebuild
// validator (scripts/validate-image-refs.mjs).
export const UPLOADS_PATH_REGEX = /^\/uploads\/.+/;
