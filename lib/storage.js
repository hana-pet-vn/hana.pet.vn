// lib/storage.js
// ─────────────────────────────────────────────────────────────────────────────
// Supabase Storage helpers for image uploads.
// Bucket: "hanapet-media"  (create this in Supabase dashboard first)
//
// Folder structure:
//   products/{product-id}/image.jpg      ← product photos
//   banners/{banner-id}/image.jpg        ← banner images
//   about/image.jpg                      ← about section photo
//   unused/{original-path}               ← replaced images moved here
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'hanapet-media'

export function getStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

/**
 * Upload an image file to Supabase Storage.
 * @param {Buffer|Blob} fileBuffer  - The file data
 * @param {string}      filePath    - Storage path e.g. "products/p1/image.jpg"
 * @param {string}      mimeType    - e.g. "image/jpeg"
 * @returns {string}                - Public URL of the uploaded image
 */
export async function uploadImage(fileBuffer, filePath, mimeType) {
  const supabase = getStorageClient()

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, fileBuffer, {
      contentType:  mimeType,
      upsert:       true,   // overwrite if same path
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

/**
 * Move an existing image to the unused/ folder instead of deleting it.
 * @param {string} currentUrl - The full public URL of the image to archive
 */
export async function archiveImage(currentUrl) {
  if (!currentUrl) return
  // Only handle URLs from our own bucket
  if (!currentUrl.includes(BUCKET)) return

  const supabase = getStorageClient()

  // Extract the path after the bucket name
  const marker = `${BUCKET}/`
  const idx = currentUrl.indexOf(marker)
  if (idx === -1) return

  const oldPath = currentUrl.slice(idx + marker.length)
  // Remove query params if any
  const cleanPath = oldPath.split('?')[0]

  // Don't re-archive something already in unused/
  if (cleanPath.startsWith('unused/')) return

  const newPath = `unused/${cleanPath}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .move(cleanPath, newPath)

  if (error) {
    // Non-fatal — log but don't throw
    console.warn(`Could not archive image ${cleanPath}:`, error.message)
  }
}

/**
 * Delete an image permanently (for cleanup of unused folder).
 * @param {string} filePath - Storage path e.g. "unused/products/p1/image.jpg"
 */
export async function deleteImage(filePath) {
  const supabase = getStorageClient()
  const { error } = await supabase.storage.from(BUCKET).remove([filePath])
  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}
