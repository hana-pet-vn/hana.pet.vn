export const metadata = {
  title: 'Hanapet',
  description: 'Hanapet — Đồ dùng và phụ kiện thú cưng tại Việt Nam 🐾',
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&display=swap" rel="stylesheet" />
        <style>{`
          * { -webkit-tap-highlight-color: transparent; }
          html, body { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
          button, a, [role="button"] { -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
