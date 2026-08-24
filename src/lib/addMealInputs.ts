/**
 * Shared file-input ids for camera vs camera-roll. Camera roll uses a
 * <label htmlFor> so iOS gets a real tap on the library input (no extra
 * Take Photo / Browse sheet from a programmatic .click()).
 */
export const ADD_MEAL_CAMERA_INPUT_ID = 'add-meal-camera-input'
export const ADD_MEAL_LIBRARY_INPUT_ID = 'add-meal-library-input'

/** Image types only — omit image/* so iOS is less likely to offer Take Photo. */
export const LIBRARY_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/heic,image/heif,image/webp,.jpg,.jpeg,.png,.heic,.heif,.webp'

/** Not display:none — iOS often ignores .click() / mis-routes capture on hidden inputs. */
export const hiddenFileInputClass = 'sr-only'

