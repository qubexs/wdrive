import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/wdrive/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/wdrive/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/wdrive/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/wdrive/apple-touch-icon.png" />
        <link rel="manifest" href="/wdrive/site.webmanifest" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
