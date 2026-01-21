import { createSitemapRouteHandler } from '@sitecore-content-sdk/nextjs/route-handler';
import { NextRequest, NextResponse } from 'next/server';
import sites from '.sitecore/sites.json';
import client from 'src/lib/sitecore-client';
import { getTargetSiteChildren, getWildcardPathPrefix } from 'src/lib/sitemap-utils';
import scConfig from 'sitecore.config';

export const dynamic = 'force-dynamic';

/**
 * API route for generating sitemap.xml
 *
 * This Next.js API route handler dynamically generates and serves the sitemap XML for your site.
 * It includes both standard Sitecore pages and wildcard pages from the target site.
 */

// Get the default sitemap handler
const defaultSitemapHandler = createSitemapRouteHandler({
  client,
  sites,
});

/**
 * Custom GET handler that extends the default sitemap with wildcard pages from target site
 */
export async function GET(request: NextRequest) {
  try {
    // Get the default sitemap from Sitecore
    const defaultResponse = await defaultSitemapHandler.GET(request);
    
    if (!defaultResponse) {
      return new NextResponse('Sitemap not available', { status: 500 });
    }

    // Get the sitemap XML content
    const sitemapXml = await defaultResponse.text();
    
    // Parse the sitemap to add wildcard pages
    const enhancedSitemap = await enhanceSitemapWithWildcardPages(sitemapXml, request);
    
    // Return the enhanced sitemap
    return new NextResponse(enhancedSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Fallback to default sitemap if enhancement fails
    return defaultSitemapHandler.GET(request);
  }
}

/**
 * Enhances the sitemap XML with wildcard pages from the target site
 */
async function enhanceSitemapWithWildcardPages(
  sitemapXml: string,
  request: NextRequest
): Promise<string> {
  const TARGET_SITE_NAME = process.env.SITECORE_TARGET_SITE_NAME || '';
  const TARGET_SITE_PATH = process.env.SITECORE_TARGET_SITE_PATH || '';

  if (!TARGET_SITE_NAME || !TARGET_SITE_PATH) {
    console.log('⚠️  Target site configuration not available, returning default sitemap');
    return sitemapXml;
  }

  try {
    // Get the site and locale from the request
    // Sitemap URLs typically don't include site/locale in the path, so we'll use defaults
    const defaultSite = scConfig.defaultSite || sites[0]?.name || '';
    const defaultLocale = 'en';

    if (!defaultSite) {
      console.log('⚠️  No default site found, returning default sitemap');
      return sitemapXml;
    }

    // Get wildcard path prefix (e.g., ['blog'])
    const wildcardPrefix = await getWildcardPathPrefix(defaultSite, defaultLocale);
    
    // Get all children from target site
    const targetChildren = await getTargetSiteChildren(defaultLocale);

    if (targetChildren.length === 0) {
      console.log('⚠️  No children found in target site, returning default sitemap');
      return sitemapXml;
    }

    console.log(`✅ Adding ${targetChildren.length} wildcard pages to sitemap`);

    // Get the base URL from the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Build URL entries for wildcard pages
    const wildcardUrlEntries: string[] = [];
    
    for (const child of targetChildren) {
      // Construct the URL path: /{site}/{locale}/{wildcardPrefix}/{childName}
      // For example: /blogs/en/blog/blog-1
      const pathSegments = [defaultSite, defaultLocale, ...wildcardPrefix, child.name];
      const urlPath = '/' + pathSegments.join('/');
      const fullUrl = `${baseUrl}${urlPath}`;
      
      // Add URL entry to sitemap
      wildcardUrlEntries.push(`
    <url>
      <loc>${escapeXml(fullUrl)}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`);
    }

    // Insert wildcard URLs before the closing </urlset> tag
    const closingTag = '</urlset>';
    if (sitemapXml.includes(closingTag)) {
      const beforeClosing = sitemapXml.replace(closingTag, '');
      return `${beforeClosing}${wildcardUrlEntries.join('')}
${closingTag}`;
    }

    // If no closing tag found, append to the end
    return sitemapXml + wildcardUrlEntries.join('');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error enhancing sitemap with wildcard pages: ${errorMessage}`);
    // Return original sitemap if enhancement fails
    return sitemapXml;
  }
}

/**
 * Escapes XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
