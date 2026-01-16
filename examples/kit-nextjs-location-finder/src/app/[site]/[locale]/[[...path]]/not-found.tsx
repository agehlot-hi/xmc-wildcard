import Link from 'next/link';
import { headers } from 'next/headers';
import { ErrorPage } from '@sitecore-content-sdk/nextjs';
import { parseRewriteHeader } from '@sitecore-content-sdk/nextjs/utils';
import client from 'lib/sitecore-client';
import scConfig from 'sitecore.config';
import Layout from 'src/Layout';
import Providers from 'src/Providers';
import { NextIntlClientProvider } from 'next-intl';

/**
 * Nested 404 page with site/locale context
 * Used when URL has site/locale segments
 */
export default async function NotFound() {
  // Extract site and locale from request headers
  const headersList = await headers();
  const { site, locale } = parseRewriteHeader(headersList);

  // Fetch Sitecore 404 page for the resolved site/locale
  try {
    const page = await client.getErrorPage(ErrorPage.NotFound, {
      site: site || scConfig.defaultSite,
      locale: locale || scConfig.defaultLanguage,
    });

    if (page) {
      return (
        <NextIntlClientProvider>
          <Providers page={page}>
            <Layout page={page} />
          </Providers>
        </NextIntlClientProvider>
      );
    }
  } catch (error) {
    console.error('Error fetching 404 page:', error);
  }

  // Fallback UI when Sitecore page not available
  return (
    <div style={{ padding: 10 }}>
      <h1>Page not found</h1>
      <p>This page does not exist.</p>
      <Link href="/">Go to the Home page</Link>
    </div>
  );
}
