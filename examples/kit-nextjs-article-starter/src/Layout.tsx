/**
 * This Layout is needed for Starter Kit.
 */
import React, { type JSX } from 'react';
import Head from 'next/head';
import {
  Page,
  Field,
  ImageField,
  AppPlaceholder,
  DesignLibraryApp,
} from '@sitecore-content-sdk/nextjs';
import Scripts from 'src/Scripts';
import SitecoreStyles from 'components/content-sdk/SitecoreStyles';
import { Figtree } from 'next/font/google';
import componentMap from '.sitecore/component-map';
import Providers from './Providers';

const heading = Figtree({
  weight: ['400', '500'],
  variable: '--font-heading',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const body = Figtree({
  weight: ['400', '500'],
  variable: '--font-body',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});
interface LayoutProps {
  page: Page;
}

export interface RouteFields {
  [key: string]: unknown;
  Title?: Field;
  metadataTitle?: Field;
  metadataKeywords?: Field;
  pageTitle?: Field;
  metadataDescription?: Field;
  pageSummary?: Field;
  ogTitle?: Field;
  ogDescription?: Field;
  ogImage?: ImageField;
  thumbnailImage?: ImageField;
}

const Layout = ({ page }: LayoutProps): JSX.Element => {
  const { layout, mode } = page;
  const { route } = layout.sitecore;
  const fields = route?.fields as RouteFields;
  const mainClassPageEditing = mode.isEditing ? 'editing-mode' : 'prod-mode';
  const classNamesMain = `${mainClassPageEditing} ${body.variable} ${heading.variable} main-layout`;

  const metaTitle =
    fields?.metadataTitle?.value?.toString() ||
    fields?.pageTitle?.value?.toString() ||
    'Page';
  const metaDescription =
    fields?.metadataDescription?.value?.toString() ||
    fields?.pageSummary?.value?.toString() ||
    '';
  const metaKeywords = fields?.metadataKeywords?.value?.toString() || '';
  const ogTitle =
    fields?.ogTitle?.value?.toString() ||
    fields?.metadataTitle?.value?.toString() ||
    fields?.pageTitle?.value?.toString() ||
    'Page';
  const ogImage =
    fields?.ogImage?.value?.src || fields?.thumbnailImage?.value?.src;
  const ogDescription =
    fields?.ogDescription?.value?.toString() ||
    fields?.metadataDescription?.value?.toString() ||
    fields?.pageSummary?.value?.toString() ||
    '';
  return (
    <>
      <Scripts />
      <SitecoreStyles layoutData={layout} />
      <Head>
        <link rel="preconnect" href="https://edge-platform.sitecorecloud.io" />
        <title>{metaTitle}</title>
        {metaDescription && (
          <meta name="description" content={metaDescription} />
        )}
        {metaKeywords && <meta name="keywords" content={metaKeywords} />}
        <link rel="icon" href="/favicon.ico" />
        {ogTitle && <meta property="og:title" content={ogTitle} />}
        {ogDescription && (
          <meta property="og:description " content={ogDescription} />
        )}
        {ogImage && <meta property="og:image " content={ogImage} />}
      </Head>
      <Providers page={page}>
        {/* root placeholder for the app, which we add components to using route data */}
        <div className={`min-h-screen flex flex-col ${classNamesMain}`}>
          {mode.isDesignLibrary ? (
            route && (
              <DesignLibraryApp
                page={page}
                rendering={route}
                componentMap={componentMap}
                loadServerImportMap={() =>
                  import('.sitecore/import-map.server')
                }
              />
            )
          ) : (
            <>
              <header>
                <div id="header">
                  {route && (
                    <AppPlaceholder
                      page={page}
                      componentMap={componentMap}
                      name="headless-header"
                      rendering={route}
                    />
                  )}
                </div>
              </header>
              <main>
                <div id="content" className="antialiased">
                  {route && (
                    <AppPlaceholder
                      page={page}
                      componentMap={componentMap}
                      name="headless-main"
                      rendering={route}
                    />
                  )}
                </div>
              </main>
              <footer>
                <div id="footer">
                  {route && (
                    <AppPlaceholder
                      page={page}
                      componentMap={componentMap}
                      name="headless-footer"
                      rendering={route}
                    />
                  )}
                </div>
              </footer>
            </>
          )}
        </div>
      </Providers>
    </>
  );
};

export default Layout;
