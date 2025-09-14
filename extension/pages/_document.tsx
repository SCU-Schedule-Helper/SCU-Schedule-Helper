import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en" className="notranslate">
      <Head>
        <meta name="google" content="notranslate" />
        <meta name="robots" content="noindex, nofollow" />
        <meta httpEquiv="Content-Language" content="en" />
      </Head>
      <body className="notranslate">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
