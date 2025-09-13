import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Prevent Google Translate from detecting and translating the page */}
        <meta name="google" content="notranslate" />
        <meta name="google-translate-customization" content="notranslate" />
        <meta httpEquiv="Content-Language" content="en" />
        <meta name="language" content="en" />
        <meta name="robots" content="noindex, nofollow, notranslate" />
        
        {/* Additional measures to prevent translation */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Hide Google Translate elements if they appear */
            .goog-te-banner-frame,
            .goog-te-gadget,
            .goog-te-gadget-simple,
            .goog-te-combo,
            .goog-te-ftab,
            .goog-te-menu-value,
            .goog-te-menu2,
            .goog-te-menu2-item,
            .goog-te-menu2-item div,
            .goog-te-menu2-item span,
            .goog-te-menu2-item:link,
            .goog-te-menu2-item:visited,
            .goog-te-menu2-item:active,
            .goog-te-menu2-item-selected,
            .goog-te-menu2-item-selected div,
            .goog-te-menu2-item-selected span,
            .goog-te-menu2-item-selected:link,
            .goog-te-menu2-item-selected:visited,
            .goog-te-menu2-item-selected:active {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              height: 0 !important;
              width: 0 !important;
              overflow: hidden !important;
            }
            
            /* Prevent Google Translate from modifying the page */
            body {
              -webkit-transform: none !important;
              -moz-transform: none !important;
              -ms-transform: none !important;
              -o-transform: none !important;
              transform: none !important;
            }
          `
        }} />
        
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
