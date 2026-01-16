import { createRobotsRouteHandler } from '@sitecore-content-sdk/nextjs/route-handler';
import sites from '.sitecore/sites.json';
import client from 'lib/sitecore-client';

export const dynamic = 'force-dynamic';

/**
 * API route for serving robots.txt
 */

export const { GET } = createRobotsRouteHandler({
  client,
  sites,
});
