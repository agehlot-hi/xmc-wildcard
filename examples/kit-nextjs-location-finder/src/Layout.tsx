import React, { type JSX } from 'react';
import {
  Field,
  ImageField,
  Page,
  AppPlaceholder,
} from '@sitecore-content-sdk/nextjs';
import Scripts from 'src/Scripts';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Sora, Roboto } from 'next/font/google';
import SitecoreStyles from 'components/content-sdk/SitecoreStyles';
import { DesignLibraryApp } from '@sitecore-content-sdk/nextjs';
import componentMap from '.sitecore/component-map';
import Providers from './Providers';

const heading = Sora({
  weight: ['300', '400', '500'],
  variable: '--font-heading',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const body = Roboto({
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
  metadataTitle?: Field;
  metadataKeywords?: Field;
  pageTitle?: Field;
  metadataDescription?: Field;
  pageSummary?: Field;
  ogTitle?: Field;
  ogDescription?: Field;
  ogImage?: ImageField;
  thumbnailImage?: ImageField;
  Title?: Field;
}

const Layout = ({ page }: LayoutProps): JSX.Element => {
  const { layout, mode } = page;
  const { route } = layout.sitecore;
  const mainClassPageEditing = mode.isEditing ? 'editing-mode' : 'prod-mode';
  const classNamesMain = `${mainClassPageEditing} ${body.variable} ${heading.variable} main-layout`;

  return (
    <>
      <Scripts />
      <SitecoreStyles layoutData={layout} />
      <Providers page={page}>
        {/* root placeholder for the app, which we add components to using route data */}
        <div className={`min-h-screen flex flex-col ${classNamesMain}`}>
          {page.mode.isDesignLibrary ? (
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
                <div id="content">
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
      <SpeedInsights />
    </>
  );
};

export default Layout;
