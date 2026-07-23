import { CartProvider } from '../lib/cart';
import CartDrawer from './_components/CartDrawer';

export const metadata = {
  title: 'Hanapet — Xịt khử mùi & tắm khô cho thú cưng',
  description: 'Hanapet — Misty Fresh xịt khử mùi HOCl và Waterless Bubble Shampoo. Giao Hà Nội trong 24h, đổi trả 7 ngày. 🐾',
  metadataBase: new URL('https://hana.pet.vn'),
  openGraph: {
    title: 'Hanapet — Xịt khử mùi & tắm khô cho thú cưng',
    description: 'Sạch mùi sau 30 giây. An toàn kể cả khi bé liếm phải.',
    url: 'https://hana.pet.vn',
    siteName: 'Hanapet',
    locale: 'vi_VN',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#18284e',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&display=swap"
          rel="stylesheet"
        />
        <style>{`
          /* v21.1: biến font MẶC ĐỊNH cho MỌI trang. Trang chủ ghi đè
             bằng font chọn trong admin (component Styles). Các trang
             phụ (giỏ, thanh toán, chi tiết SP) dùng giá trị này —
             không hardcode 'Nunito' nữa. */
          :root{--f-display:'Nunito',system-ui,sans-serif;
                --f-body:'Nunito Sans',system-ui,sans-serif}
          *{-webkit-tap-highlight-color:transparent}
          html,body{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
          button,a,[role="button"]{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
