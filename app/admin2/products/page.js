'use client'
// app/admin2/products/page.js — UI mới lên ở Phase 2; tạm bắc cầu bản cũ
import OldAdminBridge from '../_components/OldAdminBridge'

export default function Page() {
  return (
    <OldAdminBridge
      title="Sản phẩm & Kho"
      phase="Phase 2"
      note="Khai mã SKU BigSeller + đồng bộ kho hiện vẫn nằm trong tab Kho của bản cũ."
    />
  )
}
