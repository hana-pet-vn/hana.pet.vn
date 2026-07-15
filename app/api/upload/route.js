// app/api/upload/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles image uploads from the admin panel.
// - Requires admin to be authenticated (checks Supabase session)
// - Accepts: multipart/form-data with fields: file, folder, entityId, oldUrl
// - Returns: { url: "https://..." }
//
// folder options: "products", "banners", "about"
// entityId:       the product ID or banner ID (for organized paths)
// oldUrl:         previous image URL to archive (optional)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import { uploadImage, archiveImage } from '../../../lib/storage'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB   = 4

export async function POST(request) {
  try {
    // ── 1. Auth check — must be signed-in admin ───────────────────────────────
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // ── 2. Parse form data ────────────────────────────────────────────────────
    const formData = await request.formData()
    const file     = formData.get('file')
    const folder   = formData.get('folder')   || 'products'
    const entityId = formData.get('entityId') || 'general'
    const oldUrl   = formData.get('oldUrl')   || ''

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    // ── 3. Validate file ──────────────────────────────────────────────────────
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json({
        error: `File type not allowed. Use: ${ALLOWED_TYPES.join(', ')}`
      }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const sizeMB = bytes.byteLength / (1024 * 1024)
    if (sizeMB > MAX_SIZE_MB) {
      return Response.json({
        error: `File too large (${sizeMB.toFixed(1)}MB). Max ${MAX_SIZE_MB}MB.`
      }, { status: 400 })
    }

    // ── 4. Build storage path ─────────────────────────────────────────────────
    const ext       = file.name.split('.').pop().toLowerCase() || 'jpg'
    const timestamp = Date.now()
    let   filePath

    if (folder === 'about') {
      filePath = `about/image_${timestamp}.${ext}`
    } else {
      // Sanitize entityId for use in path
      const safeId = entityId.replace(/[^a-zA-Z0-9_-]/g, '_')
      filePath = `${folder}/${safeId}/image_${timestamp}.${ext}`
    }

    // ── 5. Archive old image if there is one ─────────────────────────────────
    if (oldUrl) {
      await archiveImage(oldUrl).catch(e => console.warn('Archive failed:', e))
    }

    // ── 6. Upload new image ───────────────────────────────────────────────────
    const buffer    = Buffer.from(bytes)
    const publicUrl = await uploadImage(buffer, filePath, file.type)

    return Response.json({ success: true, url: publicUrl })

  } catch (err) {
    console.error('Upload error:', err)
    return Response.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
