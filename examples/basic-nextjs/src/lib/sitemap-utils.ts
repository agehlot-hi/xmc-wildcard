import scConfig from 'sitecore.config';

/**
 * Environment variables for target site querying
 */
const TARGET_SITE_NAME = process.env.SITECORE_TARGET_SITE_NAME || '';
const TARGET_SITE_PATH = process.env.SITECORE_TARGET_SITE_PATH || '';
const WILDCARD_PATH_PREFIX = process.env.SITECORE_WILDCARD_PATH_PREFIX || 'blog';

/**
 * GraphQL query to get all children of a path
 */
const GET_CHILDREN_BY_PATH_QUERY = `
  query GetChildrenByPath($path: String!, $language: String!) {
    item(path: $path, language: $language) {
      id
      name
      path
      children(hasLayout: true) {
        results {
          id
          name
          path
          url {
            path
          }
        }
      }
    }
  }
`;

interface WildcardChild {
  id: string;
  name: string;
  path: string;
  url: {
    path: string;
  };
}

interface ChildrenResponse {
  item: {
    id: string;
    name: string;
    path: string;
    children: {
      results: WildcardChild[];
    };
  };
}

/**
 * Makes a GraphQL request to get children from target site
 */
async function makeGraphQLRequest<T>(
  baseEdgeUrl: string,
  query: string,
  variables: Record<string, unknown>,
  apiKey: string
): Promise<T> {
  const graphqlApiKey = process.env.SITECORE_GRAPHQL_API_KEY || apiKey;
  
  if (!graphqlApiKey) {
    throw new Error('GraphQL API key is not set');
  }
  
  let cleanBaseUrl = baseEdgeUrl.replace(/\/$/, '');
  
  if (cleanBaseUrl.includes('edge-platform.sitecorecloud.io')) {
    cleanBaseUrl = cleanBaseUrl.replace('edge-platform.sitecorecloud.io', 'edge.sitecorecloud.io');
  }
  
  const graphQLEndpoint = `${cleanBaseUrl}/api/graphql/v1`;

  const requestBody = {
    query,
    variables,
  };

  const response = await fetch(graphQLEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'sc_apikey': graphqlApiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data as T;
}

/**
 * Gets all children from the target site under the configured path
 * @param locale - The locale to query
 * @returns Array of child items with their names and paths
 */
export async function getTargetSiteChildren(locale: string = 'en'): Promise<WildcardChild[]> {
  if (!TARGET_SITE_NAME || !TARGET_SITE_PATH) {
    console.log('⚠️  Target site configuration not available for sitemap');
    return [];
  }

  const edgeConfig = scConfig.api?.edge;
  if (!edgeConfig?.edgeUrl || !edgeConfig?.contextId) {
    console.error('❌ Edge configuration not found for sitemap');
    return [];
  }

  // Normalize language
  const normalizedLanguage = locale && locale !== 'appspecific' ? locale : 'en';

  try {
    const response = await makeGraphQLRequest<ChildrenResponse>(
      edgeConfig.edgeUrl,
      GET_CHILDREN_BY_PATH_QUERY,
      {
        path: TARGET_SITE_PATH,
        language: normalizedLanguage,
      },
      edgeConfig.contextId
    );

    if (response.item?.children?.results) {
      console.log(`✅ Found ${response.item.children.results.length} children in target site for sitemap`);
      return response.item.children.results;
    }

    return [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error querying target site children for sitemap: ${errorMessage}`);
    return [];
  }
}

/**
 * Gets the wildcard path prefix from the current site
 * For example, if wildcard is at /blog/*, returns ['blog']
 * Uses SITECORE_WILDCARD_PATH_PREFIX environment variable if set, otherwise tries to detect it
 */
export async function getWildcardPathPrefix(site: string, locale: string): Promise<string[]> {
  // If environment variable is set, use it
  if (WILDCARD_PATH_PREFIX && WILDCARD_PATH_PREFIX !== 'blog') {
    const prefix = WILDCARD_PATH_PREFIX.split('/').filter(Boolean);
    if (prefix.length > 0) {
      return prefix;
    }
  }

  // Try to find wildcard pages in the current site
  // Common patterns: ['blog', '*'], ['*']
  const possiblePaths = [
    [WILDCARD_PATH_PREFIX, '*'],
    ['*'],
  ];

  // Import client here to avoid circular dependencies
  const { default: client } = await import('./sitecore-client');

  for (const path of possiblePaths) {
    try {
      const page = await client.getPage(path, { site, locale });
      if (page?.layout?.sitecore?.route?.name === '*') {
        // Found wildcard, return the prefix (everything except '*')
        return path.filter(segment => segment !== '*');
      }
    } catch {
      // Continue to next path
    }
  }

  // Default: use the configured prefix or 'blog'
  return [WILDCARD_PATH_PREFIX];
}
