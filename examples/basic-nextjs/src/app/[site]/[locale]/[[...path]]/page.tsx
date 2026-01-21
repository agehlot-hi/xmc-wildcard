import { isDesignLibraryPreviewData } from "@sitecore-content-sdk/nextjs/editing";
import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import { SiteInfo } from "@sitecore-content-sdk/nextjs";
import sites from ".sitecore/sites.json";
import { routing } from "src/i18n/routing";
import scConfig from "sitecore.config";
import client from "src/lib/sitecore-client";
import { resolvePageWithWildcard } from "src/lib/wildcard-resolver";
import Layout, { RouteFields } from "src/Layout";
import components from ".sitecore/component-map";
import Providers from "src/Providers";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

type PageProps = {
  params: Promise<{
    site: string;
    locale: string;
    path?: string[];
    [key: string]: string | string[] | undefined;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { site, locale, path } = await params;
  const draft = await draftMode();

  // Set site and locale to be available in src/i18n/request.ts for fetching the dictionary
  setRequestLocale(`${site}_${locale}`);

  // Fetch the page data from Sitecore
  let page;
  if (draft.isEnabled) {
    const editingParams = await searchParams;
    if (isDesignLibraryPreviewData(editingParams)) {
      page = await client.getDesignLibraryData(editingParams);
    } else {
      page = await client.getPreview(editingParams);
    }
  } else {
    // Try normal page resolution first, then fall back to wildcard resolution
    // This allows pages to be resolved from child items under the "*" wildcard node
    page = await resolvePageWithWildcard(path ?? [], site, locale);
    
    console.log(`\n📄 Page resolution result in page.tsx:`);
    console.log(`   Page: ${page ? 'found' : 'null'}`);
    if (page) {
      const routeFields = page.layout?.sitecore?.route?.fields as Record<string, unknown> | undefined;
      const titleField = routeFields?.Title as { value?: string; jsonValue?: { value?: string } } | undefined;
      console.log(`   Page name: ${page.layout?.sitecore?.route?.name || 'N/A'}`);
      console.log(`   Page itemId: ${page.layout?.sitecore?.route?.itemId || 'N/A'}`);
      console.log(`   Page has layout: ${!!page.layout}`);
      console.log(`   Title field value: ${titleField?.value || 'N/A'}`);
      console.log(`   Title jsonValue.value: ${titleField?.jsonValue?.value || 'N/A'}`);
      console.log(`   Full Title field: ${JSON.stringify(routeFields?.Title, null, 2)}`);
    }
  }

  // If the page is not found, return a 404
  if (!page) {
    console.log(`\n❌ Page is null, calling notFound()`);
    notFound();
  }
  
  console.log(`\n✅ Page found, proceeding to render`);
  
  // Log the page fields BEFORE getComponentData to see if they get overwritten
  const routeFieldsBefore = page.layout?.sitecore?.route?.fields as Record<string, unknown> | undefined;
  const titleFieldBefore = routeFieldsBefore?.Title as { value?: string; jsonValue?: { value?: string } } | undefined;
  const contentFieldBefore = routeFieldsBefore?.Content as { value?: string; jsonValue?: { value?: string } } | undefined;
  console.log(`\n📋 Page fields BEFORE getComponentData:`);
  console.log(`   Title.value: ${titleFieldBefore?.value || 'N/A'}`);
  console.log(`   Title.jsonValue.value: ${titleFieldBefore?.jsonValue?.value || 'N/A'}`);
  console.log(`   Content.value: ${contentFieldBefore?.value ? 'exists' : 'N/A'}`);

  // Store the original fields to restore them after getComponentData if needed
  const originalTitleField = titleFieldBefore ? { ...titleFieldBefore } : undefined;
  const originalContentField = contentFieldBefore ? { ...contentFieldBefore } : undefined;

  // Fetch the component data from Sitecore (Likely will be deprecated)
  const componentProps = await client.getComponentData(
    page.layout,
    {},
    components
  );
  
  // Log the page fields AFTER getComponentData to see if they were overwritten
  const routeFieldsAfter = page.layout?.sitecore?.route?.fields as Record<string, unknown> | undefined;
  const titleFieldAfter = routeFieldsAfter?.Title as { value?: string; jsonValue?: { value?: string } } | undefined;
  const contentFieldAfter = routeFieldsAfter?.Content as { value?: string; jsonValue?: { value?: string } } | undefined;
  console.log(`\n📋 Page fields AFTER getComponentData:`);
  console.log(`   Title.value: ${titleFieldAfter?.value || 'N/A'}`);
  console.log(`   Title.jsonValue.value: ${titleFieldAfter?.jsonValue?.value || 'N/A'}`);
  console.log(`   Content.value: ${contentFieldAfter?.value ? 'exists' : 'N/A'}`);
  
  // If getComponentData overwrote our custom fields, restore them
  if (originalTitleField && titleFieldBefore?.value !== titleFieldAfter?.value) {
    console.log(`   ⚠️  WARNING: Title field was changed by getComponentData!`);
    console.log(`      Before: ${titleFieldBefore?.value}`);
    console.log(`      After: ${titleFieldAfter?.value}`);
    console.log(`   🔧 Restoring original Title field...`);
    
    // Restore the original title field
    if (page.layout?.sitecore?.route) {
      const currentFields = page.layout.sitecore.route.fields as Record<string, unknown> | undefined;
      if (currentFields) {
        currentFields.Title = originalTitleField;
        console.log(`   ✅ Title field restored: ${(currentFields.Title as typeof originalTitleField)?.value || 'N/A'}`);
      }
    }
  }
  
  if (originalContentField && contentFieldBefore?.value !== contentFieldAfter?.value) {
    console.log(`   ⚠️  WARNING: Content field was changed by getComponentData!`);
    console.log(`   🔧 Restoring original Content field...`);
    
    // Restore the original content field
    if (page.layout?.sitecore?.route) {
      const currentFields = page.layout.sitecore.route.fields as Record<string, unknown> | undefined;
      if (currentFields) {
        currentFields.Content = originalContentField;
        console.log(`   ✅ Content field restored`);
      }
    }
  }

  return (
    <NextIntlClientProvider>
      <Providers page={page} componentProps={componentProps}>
        <Layout page={page} />
      </Providers>
    </NextIntlClientProvider>
  );
}

// This function gets called at build and export time to determine
// pages for SSG ("paths", as tokenized array).
export const generateStaticParams = async () => {
  if (process.env.NODE_ENV !== "development" && scConfig.generateStaticPaths) {
    // Filter sites to only include the sites this starter is designed to serve.
    // This prevents cross-site build errors when multiple starters share the same XM Cloud instance.
    const defaultSite = scConfig.defaultSite;
    const allowedSites = defaultSite
      ? sites
          .filter((site: SiteInfo) => site.name === defaultSite)
          .map((site: SiteInfo) => site.name)
      : sites.map((site: SiteInfo) => site.name);
    return await client.getAppRouterStaticParams(
      allowedSites,
      routing.locales.slice()
    );
  }
  return [];
};

// Metadata fields for the page.
export const generateMetadata = async ({ params }: PageProps) => {
  const { path, site, locale } = await params;

  // The same call as for rendering the page. Should be cached by default react behavior
  // Use wildcard resolution for metadata as well
  const page = await resolvePageWithWildcard(path ?? [], site, locale);
  return {
    title:
      (
        page?.layout.sitecore.route?.fields as RouteFields
      )?.Title?.value?.toString() || "Page",
  };
};
