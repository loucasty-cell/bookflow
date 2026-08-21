import '../src/styles.css'
import Script from 'next/script'

const windowEnvProtectionScript = `
(() => {
  try {
    if (typeof window !== 'undefined') {
      let currentFetch = window.fetch ? window.fetch.bind(window) : undefined;
      const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
      if (!desc || !desc.set || !desc.writable) {
        try {
          Object.defineProperty(window, 'fetch', {
            get() {
              return currentFetch;
            },
            set(newFetch) {
              currentFetch = newFetch;
            },
            configurable: true,
            enumerable: true,
          });
        } catch {
          try {
            Object.defineProperty(Window.prototype, 'fetch', {
              get() {
                return currentFetch;
              },
              set(newFetch) {
                currentFetch = newFetch;
              },
              configurable: true,
              enumerable: true,
            });
          } catch {}
        }
      }
    }
  } catch {}

  const attributeName = 'bis_skin_checked';
  const clean = (node) => {
    if (!(node instanceof Element)) return;
    node.removeAttribute(attributeName);
    node.querySelectorAll('[' + attributeName + ']').forEach((element) => {
      element.removeAttribute(attributeName);
    });
  };
  clean(document.documentElement);
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === 'attributes') clean(record.target);
      record.addedNodes.forEach(clean);
    });
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [attributeName],
    childList: true,
    subtree: true,
  });
  window.addEventListener('load', () => {
    window.setTimeout(() => {
      clean(document.documentElement);
      observer.disconnect();
    }, 0);
  }, { once: true });
})();
`

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
    <html lang="en">
      <head>
        <script
          id="window-protection-init"
          dangerouslySetInnerHTML={{ __html: windowEnvProtectionScript }}
        />
      </head>
      <body>
        <Script id="extension-hydration-guard" strategy="beforeInteractive">
          {windowEnvProtectionScript}
        </Script>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
