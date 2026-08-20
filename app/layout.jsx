import '../src/styles.css'

export const metadata = {
  title: 'Bookflow — Read in your rhythm',
  description: 'Bookflow turns PDFs and ebooks into a calm, private paragraph-focused reading experience.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fffefa' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ]
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
