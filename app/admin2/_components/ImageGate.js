'use client'
// app/admin2/_components/ImageGate.js
// ─────────────────────────────────────────────────────────────────────
// GÁC CỔNG ẢNH (thay CropModal đã BỎ theo chốt 31/07 — crop nhiều bug).
// Nguyên tắc: KHÔNG crop. Chỉ làm 3 việc:
//   1. Kiểm TỈ LỆ theo chuẩn từng vị trí → sai thì TỪ CHỐI kèm hướng dẫn
//   2. Ảnh đúng tỉ lệ nhưng quá to → tự THU NHỎ + NÉN (không đổi tỉ lệ)
//   3. Riêng mascot: kiểm thêm ĐỘ TỐI (ảnh tối quá nhìn không ra con pet)
//
// Cách dùng:
//   import { checkImage, IMAGE_SPECS } from '../_components/ImageGate'
//   const result = await checkImage(file, 'product')
//   if (!result.ok) toast.err(result.reason)
//   else upload(result.file)   // file đã được thu nhỏ + nén nếu cần
// ─────────────────────────────────────────────────────────────────────

// Chuẩn từng vị trí ảnh — ratio = rộng/cao, tol = sai số cho phép (±)
export const IMAGE_SPECS = {
  product: {
    ratio: 1, tol: 0.02, maxSide: 1200, quality: 0.85,
    hint: 'Ảnh sản phẩm phải VUÔNG (1:1). Mở ảnh trong Photos/Canva, cắt thành hình vuông rồi tải lại.',
  },
  banner: {
    ratio: 16 / 9, tol: 0.05, maxSide: 1920, quality: 0.85,
    hint: 'Banner phải tỉ lệ 16:9 (ngang như màn hình TV). Cắt ảnh về 16:9 rồi tải lại.',
  },
  bannerMobile: {
    ratio: 4 / 5, tol: 0.05, maxSide: 1080, quality: 0.85,
    hint: 'Banner điện thoại phải tỉ lệ 4:5 (dọc). Cắt ảnh về 4:5 rồi tải lại.',
  },
  mascot: {
    ratio: 1, tol: 0.02, maxSide: 800, quality: 0.9, checkDark: true,
    hint: 'Ảnh mascot phải VUÔNG (1:1) và đủ sáng để thấy rõ con pet.',
  },
}

const MAX_UPLOAD_MB = 8 // ảnh nguồn to hơn mức này thì từ chối luôn cho nhẹ máy

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('File không phải ảnh hợp lệ')) }
    img.src = url
  })
}

// Đo độ sáng trung bình 0–255 (vẽ nhỏ 32px cho nhanh)
function avgBrightness(img) {
  const c = document.createElement('canvas')
  c.width = 32; c.height = 32
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0, 32, 32)
  const d = ctx.getImageData(0, 0, 32, 32).data
  let sum = 0
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  return sum / (d.length / 4)
}

function resizeAndCompress(img, maxSide, quality, type) {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  c.getContext('2d').drawImage(img, 0, 0, w, h)
  const outType = type === 'image/png' ? 'image/png' : 'image/jpeg'
  return new Promise(resolve => c.toBlob(b => resolve({ blob: b, w, h }), outType, quality))
}

export async function checkImage(file, specKey) {
  const spec = IMAGE_SPECS[specKey]
  if (!spec) return { ok: false, reason: `Không có chuẩn ảnh cho vị trí "${specKey}"` }

  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return { ok: false, reason: `Ảnh nặng quá ${MAX_UPLOAD_MB}MB. Xuất ảnh nhỏ hơn rồi tải lại.` }
  }

  let img, url
  try { ({ img, url } = await loadImage(file)) }
  catch (e) { return { ok: false, reason: e.message } }

  try {
    // 1. Kiểm tỉ lệ — sai thì TỪ CHỐI, không tự cắt
    const ratio = img.width / img.height
    if (Math.abs(ratio - spec.ratio) > spec.tol) {
      return {
        ok: false,
        reason: `Ảnh đang ${img.width}×${img.height} (sai tỉ lệ). ${spec.hint}`,
      }
    }

    // 2. Mascot: kiểm độ tối
    if (spec.checkDark && avgBrightness(img) < 60) {
      return { ok: false, reason: 'Ảnh tối quá, nhìn không rõ mascot. Chọn ảnh sáng hơn.' }
    }

    // 3. Đúng tỉ lệ → thu nhỏ + nén nếu cần
    if (Math.max(img.width, img.height) > spec.maxSide || file.size > 1.5 * 1024 * 1024) {
      const { blob, w, h } = await resizeAndCompress(img, spec.maxSide, spec.quality, file.type)
      const outFile = new File([blob], file.name, { type: blob.type })
      return { ok: true, file: outFile, note: `Đã thu nhỏ về ${w}×${h}` }
    }

    return { ok: true, file }
  } finally {
    URL.revokeObjectURL(url)
  }
}
