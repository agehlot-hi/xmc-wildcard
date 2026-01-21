import { Page } from '@sitecore-content-sdk/nextjs';
import client from './sitecore-client';
import scConfig from 'sitecore.config';

/**
 * Type definition for Sitecore field structure
 */
interface SitecoreField {
  value?: string;
  jsonValue?: {
    value?: string;
  };
  [key: string]: unknown;
}

/**
 * Environment variables for external site querying:
 * - SITECORE_TARGET_SITE_NAME: The name of the target site to query (e.g., "target")
 * - SITECORE_TARGET_SITE_PATH: The Sitecore content path to query (e.g., "/sitecore/content/bcu/target/Home/blog")
 */
const TARGET_SITE_NAME = process.env.SITECORE_TARGET_SITE_NAME || '';
const TARGET_SITE_PATH = process.env.SITECORE_TARGET_SITE_PATH || '';

/**
 * Makes a direct GraphQL request with explicit sc_apikey header
 * Uses the exact endpoint format that works in GraphQL IDE: {edgeUrl}/api/graphql/v1
 */
async function makeGraphQLRequest<T>(
  baseEdgeUrl: string,
  query: string,
  variables: Record<string, unknown>,
  apiKey: string
): Promise<T> {
  // Get the API key from environment variable if available, otherwise use the provided one
  // The environment variable SITECORE_GRAPHQL_API_KEY takes precedence
  const graphqlApiKey = process.env.SITECORE_GRAPHQL_API_KEY || apiKey;
  
  if (!graphqlApiKey) {
    throw new Error('GraphQL API key is not set. Please set SITECORE_GRAPHQL_API_KEY environment variable or ensure contextId is configured.');
  }
  
  // Construct the exact endpoint format that works: {edgeUrl}/api/graphql/v1
  // Remove trailing slash from base URL if present
  // Also fix edge-platform to edge if needed (some configs use edge-platform)
  let cleanBaseUrl = baseEdgeUrl.replace(/\/$/, '');
  
  // Fix edge-platform.sitecorecloud.io to edge.sitecorecloud.io
  if (cleanBaseUrl.includes('edge-platform.sitecorecloud.io')) {
    cleanBaseUrl = cleanBaseUrl.replace('edge-platform.sitecorecloud.io', 'edge.sitecorecloud.io');
    console.log(`   ⚠️  Fixed edge URL: ${baseEdgeUrl} -> ${cleanBaseUrl}`);
  }
  
  const graphQLEndpoint = `${cleanBaseUrl}/api/graphql/v1`;

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔍 GRAPHQL QUERY EXECUTION`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📍 STEP 1: Endpoint Configuration`);
  console.log(`   Base Edge URL: ${baseEdgeUrl}`);
  console.log(`   GraphQL Endpoint: ${graphQLEndpoint}`);
  console.log(`   API Key Source: ${process.env.SITECORE_GRAPHQL_API_KEY ? 'Environment Variable (SITECORE_GRAPHQL_API_KEY)' : 'Config (contextId)'}`);
  console.log(`   API Key (last 4 chars): ${graphqlApiKey ? '***' + graphqlApiKey.slice(-4) : 'NOT SET'}`);
  
  console.log(`\n📍 STEP 2: Query Details`);
  console.log(`   Query:`);
  console.log(query.split('\n').map(line => `     ${line}`).join('\n'));
  
  console.log(`\n📍 STEP 3: Variables`);
  console.log(JSON.stringify(variables, null, 2).split('\n').map(line => `   ${line}`).join('\n'));
  
  console.log(`\n📍 STEP 4: Request Headers`);
  console.log(`   Content-Type: application/json`);
  console.log(`   sc_apikey: ${graphqlApiKey ? '***' + graphqlApiKey.slice(-4) : 'NOT SET'}`);
  
  console.log(`\n📍 STEP 5: Sending Request...`);

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

  console.log(`   Response Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`   ❌ Failed: ${response.status} ${response.statusText}`);
    console.error(`   Response Body: ${errorText}`);
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    console.error(`   GraphQL errors:`, JSON.stringify(result.errors, null, 2));
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  console.log(`   ✅ Success - Response Data:`, JSON.stringify(result.data, null, 2));
  return result.data as T;
}

/**
 * GraphQL query to get all children of a wildcard node by path
 * Following Sitecore's recommended query format from:
 * https://doc.sitecore.com/xp/en/developers/101/developer-tools/query-examples.html
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

/**
 * GraphQL query to get all children of a wildcard node by ID (GUID)
 * This matches the exact format that works in Sitecore GraphQL playground
 */
const GET_CHILDREN_BY_ID_QUERY = `
  query GetChildrenById($path: String!, $language: String!) {
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
 * GraphQL query to get item with title and content fields from target site
 */
const GET_ITEM_WITH_FIELDS_QUERY = `
  query GetItemWithFields($path: String!, $language: String!) {
    item(path: $path, language: $language) {
      id
      name
      path
      fields {
        name
        value
      }
    }
  }
`;

interface ItemField {
  name: string;
  value: string;
}

interface ItemWithFieldsResponse {
  item: {
    id: string;
    name: string;
    path: string;
    fields: ItemField[];
  };
}

/**
 * Queries the target site for children and creates a page if a matching item is found
 * @param path - The requested path segments (e.g., ['blog', 'blog-1'])
 * @param site - The current site name
 * @param locale - The locale
 * @returns The created page or null if not found
 */
async function queryTargetSiteAndCreatePage(
  path: string[],
  site: string,
  locale: string
): Promise<Page | null> {
  try {
    if (!TARGET_SITE_NAME || !TARGET_SITE_PATH) {
      console.log(`   ⚠️  Target site configuration not available`);
      return null;
    }

    const edgeConfig = scConfig.api?.edge;
    if (!edgeConfig?.edgeUrl || !edgeConfig?.contextId) {
      console.error('   ❌ Edge configuration not found');
      return null;
    }

    // Get the item name from the path (e.g., 'blog-1' from ['blog', 'blog-1'])
    // Filter out any invalid path segments (like .well-known paths)
    const validPath = path.filter(segment => 
      segment && 
      !segment.includes('.') && 
      !segment.startsWith('.well-known') &&
      segment !== 'com.chrome.devtools.json'
    );
    
    const itemName = validPath.length > 1 ? validPath[validPath.length - 1] : validPath[0];
    const targetItemPath = `${TARGET_SITE_PATH}/${itemName}`;

    // Normalize language - ensure it's a valid language code (e.g., 'en' not 'appspecific')
    const normalizedLanguage = locale && locale !== 'appspecific' ? locale : 'en';

    console.log(`\n   Original path: [${path.join(', ')}]`);
    console.log(`   Valid path: [${validPath.join(', ')}]`);
    console.log(`   Item name: ${itemName}`);
    console.log(`   Target item path: ${targetItemPath}`);
    console.log(`   Original locale: ${locale}`);
    console.log(`   Normalized language: ${normalizedLanguage}`);

    // Query the target site's item with title and content fields
    const itemResponse = await makeGraphQLRequest<ItemWithFieldsResponse>(
      edgeConfig.edgeUrl,
      GET_ITEM_WITH_FIELDS_QUERY,
      {
        path: targetItemPath,
        language: normalizedLanguage,
      },
      edgeConfig.contextId
    );

    if (itemResponse.item) {
      console.log(`   ✅ Found item in target site: ${itemResponse.item.name}`);
      
      // Extract title and content fields
      const titleField = itemResponse.item.fields?.find(f => 
        f.name === 'Title' || f.name === 'title'
      );
      const contentField = itemResponse.item.fields?.find(f => 
        f.name === 'Content' || f.name === 'content'
      );

      const title = titleField?.value || itemResponse.item.name;
      const content = contentField?.value || '';

      console.log(`   Title: ${title}`);
      console.log(`   Content: ${content ? content.substring(0, 50) + '...' : 'N/A'}`);

      // Now get the wildcard page from the current site to use as a template
      // Try different wildcard path formats
      const wildcardPaths = [
        path.length > 0 ? [path[0], '*'] : ['*'],  // ['blog', '*']
        ['*'],  // Just ['*']
        path.length > 0 ? [path[0]] : [],  // Try parent path first, then look for wildcard child
      ];
      
      let wildcardPage = null;
      for (const wildcardPath of wildcardPaths) {
        console.log(`   Trying to get wildcard page with path: [${wildcardPath.join(', ')}]`);
        try {
          wildcardPage = await client.getPage(wildcardPath, { site, locale });
          if (wildcardPage) {
            // Check if this is actually a wildcard page (has '*' in path or name)
            // Note: itemPath may not be available on RouteData type, use name instead
            const route = wildcardPage.layout?.sitecore?.route;
            const itemName = route?.name || '';
            // Check if name is '*' or if the path segments indicate a wildcard
            const isWildcard = itemName === '*' || wildcardPath.includes('*');
            
            if (isWildcard || wildcardPath.includes('*')) {
              console.log(`   ✅ Found wildcard page with path: [${wildcardPath.join(', ')}]`);
              console.log(`      Item Name: ${itemName}`);
              break;
            } else if (wildcardPath.length > 0 && wildcardPath[wildcardPath.length - 1] !== '*') {
              // This is a parent page, try to get the wildcard child
              console.log(`   Found parent page, trying to get wildcard child...`);
              try {
                const childWildcardPage = await client.getPage([...wildcardPath, '*'], { site, locale });
                if (childWildcardPage) {
                  const childRoute = childWildcardPage.layout?.sitecore?.route;
                  const childItemName = childRoute?.name || '';
                  // Check if name is '*' to confirm it's a wildcard page
                  if (childItemName === '*') {
                    console.log(`   ✅ Found wildcard child page`);
                    console.log(`      Item Name: ${childItemName}`);
                    wildcardPage = childWildcardPage;
                    break;
                  }
                }
              } catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.log(`   Could not get wildcard child: ${errorMessage}`);
              }
            }
          }
        } catch (error) {
          console.log(`   Failed to get page with path [${wildcardPath.join(', ')}]: ${(error as Error).message}`);
        }
      }

      if (wildcardPage) {
        console.log(`   ✅ Found wildcard page in current site, creating page with target site data...`);
        
        // Create a modified page with the title and content from target site
        // We'll clone the wildcard page structure but update the route fields
        // IMPORTANT: Override fields completely to ensure target site values are used
        const route = wildcardPage.layout?.sitecore?.route;
        if (!route) {
          console.log(`   ⚠️  Wildcard page has no route, cannot create page`);
          return null;
        }
        const existingFields = route.fields || {};
        
        // Get the existing Title field structure to preserve metadata (if it exists)
        const existingTitleField = existingFields.Title as SitecoreField | undefined;
        const existingContentField = existingFields.Content as SitecoreField | undefined;
        
        // Create new fields object, ensuring Title and Content from target site override wildcard page fields
        // Preserve the field structure (jsonValue, editable, etc.) but update the value
        const updatedFields: Record<string, unknown> = {
          ...existingFields,
        };
        
        // Override Title field with target site value, preserving field structure
        // Sitecore TextField can have both 'value' and 'jsonValue.value' - we need to update both
        // Create a deep copy to avoid reference issues
        updatedFields.Title = {
          ...(existingTitleField ? JSON.parse(JSON.stringify(existingTitleField)) : {}),
          value: title,
          // Always include jsonValue structure for TextField compatibility
          jsonValue: {
            ...(existingTitleField?.jsonValue ? JSON.parse(JSON.stringify(existingTitleField.jsonValue)) : {}),
            value: title,
          },
        };
        
        // Override Content field with target site value if it exists
        if (content) {
          updatedFields.Content = {
            ...(existingContentField ? JSON.parse(JSON.stringify(existingContentField)) : {}),
            value: content,
            // Always include jsonValue structure for RichTextField compatibility
            jsonValue: {
              ...(existingContentField?.jsonValue ? JSON.parse(JSON.stringify(existingContentField.jsonValue)) : {}),
              value: content,
            },
          };
        }
        
        // Create a deep copy of the page to avoid mutating the original
        // Using JSON.parse/stringify for deep cloning (structuredClone may not be available in all Node versions)
        const modifiedPage: Page = JSON.parse(JSON.stringify(wildcardPage));
        
        // Log placeholder structure before modification to verify it's preserved
        console.log(`   📋 Placeholders before modification:`);
        const routeBefore = modifiedPage.layout?.sitecore?.route;
        if (routeBefore?.placeholders) {
          const placeholderNames = Object.keys(routeBefore.placeholders);
          console.log(`      Found ${placeholderNames.length} placeholder(s): ${placeholderNames.join(', ')}`);
          placeholderNames.forEach(phName => {
            const ph = routeBefore.placeholders[phName];
            if (Array.isArray(ph)) {
              console.log(`      ${phName}: ${ph.length} component(s)`);
              ph.forEach((comp, idx) => {
                const compName = (comp as { componentName?: string })?.componentName || 'unknown';
                console.log(`        [${idx}] ${compName}`);
              });
            }
          });
        } else {
          console.log(`      ⚠️  No placeholders found in route!`);
        }
        
        // Update the route fields with target site content
        if (modifiedPage.layout?.sitecore?.route) {
          modifiedPage.layout.sitecore.route.name = itemResponse.item.name;
          modifiedPage.layout.sitecore.route.itemId = itemResponse.item.id;
          modifiedPage.layout.sitecore.route.fields = updatedFields as typeof route.fields;
          
          // Update placeholders to ensure components reading from datasource/contextItem get updated values
          // Components like Title read from fields.data.datasource or fields.data.contextItem first
          // IMPORTANT: Only update fields within placeholders, don't modify the placeholder structure itself
          if (modifiedPage.layout.sitecore.route.placeholders) {
            const titleField = updatedFields.Title as SitecoreField | undefined;
            const contentField = updatedFields.Content as SitecoreField | undefined;
            
            let updatedCount = 0;
            
            // Helper function to update datasource/contextItem fields
            const updateRenderingFields = (rendering: unknown, placeholderName: string, index: number) => {
              if (rendering && typeof rendering === 'object' && 'fields' in rendering) {
                const renderingFields = rendering.fields as Record<string, unknown>;
                if (renderingFields.data && typeof renderingFields.data === 'object') {
                  const data = renderingFields.data as { 
                    datasource?: { field?: { jsonValue?: { value?: string } } }; 
                    contextItem?: { field?: { jsonValue?: { value?: string } } } 
                  };
                  
                  // Update contextItem field if it exists (Title component reads this first)
                  if (data.contextItem?.field?.jsonValue && titleField) {
                    const oldValue = data.contextItem.field.jsonValue.value;
                    data.contextItem.field.jsonValue.value = titleField.value || titleField.jsonValue?.value || '';
                    if (oldValue !== data.contextItem.field.jsonValue.value) {
                      updatedCount++;
                      console.log(`   🔧 Updated contextItem in ${placeholderName}[${index}]: "${oldValue}" -> "${data.contextItem.field.jsonValue.value}"`);
                    }
                  }
                  
                  // Update datasource field if it exists
                  if (data.datasource?.field?.jsonValue && titleField) {
                    const oldValue = data.datasource.field.jsonValue.value;
                    data.datasource.field.jsonValue.value = titleField.value || titleField.jsonValue?.value || '';
                    if (oldValue !== data.datasource.field.jsonValue.value) {
                      updatedCount++;
                      console.log(`   🔧 Updated datasource in ${placeholderName}[${index}]: "${oldValue}" -> "${data.datasource.field.jsonValue.value}"`);
                    }
                  }
                }
              }
            };
            
            // Update all renderings in all placeholders
            const routeForPlaceholders = modifiedPage.layout?.sitecore?.route;
            if (routeForPlaceholders?.placeholders) {
              Object.keys(routeForPlaceholders.placeholders).forEach(placeholderName => {
                const placeholder = routeForPlaceholders.placeholders[placeholderName];
              if (Array.isArray(placeholder)) {
                placeholder.forEach((rendering, index) => {
                  updateRenderingFields(rendering, placeholderName, index);
                });
              }
            });
            }
            
            console.log(`   ✅ Updated ${updatedCount} datasource/contextItem field(s) in placeholders`);
          }
          
          // Log placeholder structure after modification to verify it's still intact
          console.log(`   📋 Placeholders after modification:`);
          const routeAfter = modifiedPage.layout?.sitecore?.route;
          if (routeAfter?.placeholders) {
            const placeholderNames = Object.keys(routeAfter.placeholders);
            console.log(`      Found ${placeholderNames.length} placeholder(s): ${placeholderNames.join(', ')}`);
            placeholderNames.forEach(phName => {
              const ph = routeAfter.placeholders[phName];
              if (Array.isArray(ph)) {
                console.log(`      ${phName}: ${ph.length} component(s)`);
                ph.forEach((comp, idx) => {
                  const compName = (comp as { componentName?: string })?.componentName || 'unknown';
                  console.log(`        [${idx}] ${compName}`);
                });
              }
            });
          } else {
            console.log(`      ⚠️  No placeholders found in route!`);
          }
        }
        
        console.log(`   Updated fields:`);
        const titleField = updatedFields.Title as SitecoreField | undefined;
        const contentField = updatedFields.Content as SitecoreField | undefined;
        console.log(`     Title field value: ${titleField?.value || 'N/A'}`);
        console.log(`     Title jsonValue: ${titleField?.jsonValue?.value || 'N/A'}`);
        console.log(`     Content field value: ${contentField?.value ? 'exists (' + String(contentField.value).substring(0, 50) + '...)' : 'N/A'}`);
        console.log(`     Content jsonValue: ${contentField?.jsonValue?.value ? 'exists' : 'N/A'}`);
        console.log(`     Verifying in modified page:`);
        const modifiedRoute = modifiedPage.layout?.sitecore?.route;
        const routeFields = modifiedRoute?.fields as Record<string, unknown> | undefined;
        const routeTitleField = routeFields?.Title as SitecoreField | undefined;
        const routeContentField = routeFields?.Content as SitecoreField | undefined;
        console.log(`       Title: ${routeTitleField?.value || 'N/A'}`);
        console.log(`       Title (jsonValue): ${routeTitleField?.jsonValue?.value || 'N/A'}`);
        console.log(`       Content: ${routeContentField?.value ? 'exists' : 'N/A'}`);

        console.log(`   ✅ Created page successfully with target site content`);
        console.log(`   Page name: ${modifiedPage.layout?.sitecore?.route?.name}`);
        console.log(`   Page itemId: ${modifiedPage.layout?.sitecore?.route?.itemId}`);
        console.log(`   Page has layout: ${!!modifiedPage.layout}`);
        console.log(`   Returning page from queryTargetSiteAndCreatePage`);
        return modifiedPage;
      } else {
        console.log(`   ⚠️  Wildcard page not found in current site with any path format`);
        console.log(`   Attempting to get parent page to use as template...`);
        
        // Try to get the parent page (e.g., 'blog') to use as a template
        const parentPath = path.length > 0 ? [path[0]] : [];
        console.log(`   Trying to get parent page with path: [${parentPath.join(', ')}]`);
        const parentPage = await client.getPage(parentPath, { site, locale });
        
        if (parentPage) {
          console.log(`   ✅ Found parent page, using it as template...`);
          
          // Create a modified page using parent page as template
          const parentRoute = parentPage.layout?.sitecore?.route;
          if (!parentRoute) {
            console.log(`   ⚠️  Parent page has no route, cannot create page`);
            return null;
          }
          const existingFields = parentRoute.fields || {};
          
          // Get the existing field structures to preserve metadata
          const existingTitleField = existingFields.Title as SitecoreField | undefined;
          const existingContentField = existingFields.Content as SitecoreField | undefined;
          
          // Create new fields object, ensuring Title and Content from target site override parent page fields
          const updatedFields: Record<string, unknown> = {
            ...existingFields,
          };
          
          // Override Title field with target site value, preserving field structure
          // Sitecore TextField can have both 'value' and 'jsonValue.value' - we need to update both
          // Create a deep copy to avoid reference issues
          updatedFields.Title = {
            ...(existingTitleField ? JSON.parse(JSON.stringify(existingTitleField)) : {}),
            value: title,
            // Always include jsonValue structure for TextField compatibility
            jsonValue: {
              ...(existingTitleField?.jsonValue ? JSON.parse(JSON.stringify(existingTitleField.jsonValue)) : {}),
              value: title,
            },
          };
          
          // Override Content field with target site value if it exists
          if (content) {
            updatedFields.Content = {
              ...(existingContentField ? JSON.parse(JSON.stringify(existingContentField)) : {}),
              value: content,
              // Always include jsonValue structure for RichTextField compatibility
              jsonValue: {
                ...(existingContentField?.jsonValue ? JSON.parse(JSON.stringify(existingContentField.jsonValue)) : {}),
                value: content,
              },
            };
          }
          
          // Create a deep copy to preserve placeholders structure
          const modifiedPage: Page = JSON.parse(JSON.stringify(parentPage));
          
          // Update the route fields with target site content, preserving placeholders
          if (modifiedPage.layout?.sitecore?.route) {
            modifiedPage.layout.sitecore.route.name = itemResponse.item.name;
            modifiedPage.layout.sitecore.route.itemId = itemResponse.item.id;
            modifiedPage.layout.sitecore.route.fields = updatedFields as typeof parentRoute.fields;
            // Placeholders are already preserved in the deep copy
          }
          
          console.log(`   Updated fields:`);
          const titleField = updatedFields.Title as SitecoreField | undefined;
          const contentField = updatedFields.Content as SitecoreField | undefined;
          console.log(`     Title field value: ${titleField?.value || 'N/A'}`);
          console.log(`     Title jsonValue: ${titleField?.jsonValue?.value || 'N/A'}`);
          console.log(`     Content field value: ${contentField?.value ? 'exists' : 'N/A'}`);
          console.log(`     Verifying in modified page:`);
          const modifiedRoute = modifiedPage.layout?.sitecore?.route;
          const routeFields = modifiedRoute?.fields as Record<string, unknown> | undefined;
          const routeTitleField = routeFields?.Title as SitecoreField | undefined;
          const routeContentField = routeFields?.Content as SitecoreField | undefined;
          console.log(`       Title: ${routeTitleField?.value || 'N/A'}`);
          console.log(`       Title (jsonValue): ${routeTitleField?.jsonValue?.value || 'N/A'}`);
          console.log(`       Content: ${routeContentField?.value ? 'exists' : 'N/A'}`);

          console.log(`   ✅ Created page successfully using parent page as template`);
          console.log(`   Page name: ${modifiedPage.layout?.sitecore?.route?.name}`);
          console.log(`   Page itemId: ${modifiedPage.layout?.sitecore?.route?.itemId}`);
          console.log(`   Page has layout: ${!!modifiedPage.layout}`);
          console.log(`   Returning page from queryTargetSiteAndCreatePage`);
          return modifiedPage;
        } else {
          console.log(`   ❌ Could not find parent page either`);
          console.log(`   Trying to get root page as last resort...`);
          
          // Last resort: try to get the root page
          const rootPage = await client.getPage([], { site, locale });
          if (rootPage) {
            console.log(`   ✅ Found root page, using it as template...`);
            
            const rootRoute = rootPage.layout?.sitecore?.route;
            if (!rootRoute) {
              console.log(`   ⚠️  Root page has no route, cannot create page`);
              return null;
            }
            const existingFields = rootRoute.fields || {};
            
            // Get the existing field structures to preserve metadata
            const existingTitleField = existingFields.Title as SitecoreField | undefined;
            const existingContentField = existingFields.Content as SitecoreField | undefined;
            
            // Create new fields object, ensuring Title and Content from target site override root page fields
            const updatedFields: Record<string, unknown> = {
              ...existingFields,
            };
            
            // Override Title field with target site value, preserving field structure
            // Sitecore TextField can have both 'value' and 'jsonValue.value' - we need to update both
            // Create a deep copy to avoid reference issues
            updatedFields.Title = {
              ...(existingTitleField ? JSON.parse(JSON.stringify(existingTitleField)) : {}),
              value: title,
              // Always include jsonValue structure for TextField compatibility
              jsonValue: {
                ...(existingTitleField?.jsonValue ? JSON.parse(JSON.stringify(existingTitleField.jsonValue)) : {}),
                value: title,
              },
            };
            
            // Override Content field with target site value if it exists
            if (content) {
              updatedFields.Content = {
                ...(existingContentField ? JSON.parse(JSON.stringify(existingContentField)) : {}),
                value: content,
                // Always include jsonValue structure for RichTextField compatibility
                jsonValue: {
                  ...(existingContentField?.jsonValue ? JSON.parse(JSON.stringify(existingContentField.jsonValue)) : {}),
                  value: content,
                },
              };
            }
            
            // Create a deep copy to preserve placeholders structure
            const modifiedPage: Page = JSON.parse(JSON.stringify(rootPage));
            
            // Update the route fields with target site content, preserving placeholders
            if (modifiedPage.layout?.sitecore?.route) {
              modifiedPage.layout.sitecore.route.name = itemResponse.item.name;
              modifiedPage.layout.sitecore.route.itemId = itemResponse.item.id;
              modifiedPage.layout.sitecore.route.fields = updatedFields as typeof rootRoute.fields;
              // Placeholders are already preserved in the deep copy
            }
            
            console.log(`   Updated fields:`);
            const titleField = updatedFields.Title as SitecoreField | undefined;
            const contentField = updatedFields.Content as SitecoreField | undefined;
            console.log(`     Title field value: ${titleField?.value || 'N/A'}`);
            console.log(`     Title jsonValue: ${titleField?.jsonValue?.value || 'N/A'}`);
            console.log(`     Content field value: ${contentField?.value ? 'exists' : 'N/A'}`);
            console.log(`     Verifying in modified page:`);
            const modifiedRoute = modifiedPage.layout?.sitecore?.route;
            const routeFields = modifiedRoute?.fields as Record<string, unknown> | undefined;
            const routeTitleField = routeFields?.Title as SitecoreField | undefined;
            const routeContentField = routeFields?.Content as SitecoreField | undefined;
            console.log(`       Title: ${routeTitleField?.value || 'N/A'}`);
            console.log(`       Title (jsonValue): ${routeTitleField?.jsonValue?.value || 'N/A'}`);
            console.log(`       Content: ${routeContentField?.value ? 'exists' : 'N/A'}`);

            console.log(`   ✅ Created page successfully using root page as template`);
            console.log(`   Returning page from queryTargetSiteAndCreatePage`);
            return modifiedPage;
          } else {
            console.log(`   ❌ Could not find root page either, cannot create page structure`);
          }
        }
      }
    } else {
      console.log(`   ❌ Item not found in target site at path: ${targetItemPath}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error querying target site: ${errorMessage}`);
  }

  return null;
}

/**
 * Queries and logs all children under a wildcard node for debugging
 * Uses itemId if itemPath is not available
 */
async function logWildcardChildren(
  wildcardItemPath: string | undefined,
  wildcardItemId: string | undefined,
  language: string
): Promise<void> {
  try {
    const edgeConfig = scConfig.api?.edge;
    if (!edgeConfig?.edgeUrl || !edgeConfig?.contextId) {
      console.error('Edge configuration not found');
      return;
    }

    // Use direct fetch with exact endpoint format that works in GraphQL IDE
    // Endpoint format: {edgeUrl}/api/graphql/v1
    // Header: sc_apikey: {contextId}
    console.log(`\n🔧 GraphQL Client Configuration:`);
    console.log(`   Base Edge URL: ${edgeConfig.edgeUrl}`);
    console.log(`   Expected Endpoint: ${edgeConfig.edgeUrl?.replace(/\/$/, '')}/api/graphql/v1`);
    console.log(`   Context ID: ${edgeConfig.contextId ? '***' + edgeConfig.contextId.slice(-4) : 'NOT SET'}`);
    console.log(`   Header: sc_apikey = ${edgeConfig.contextId ? '***' + edgeConfig.contextId.slice(-4) : 'NOT SET'}`);
    
    if (!edgeConfig.contextId) {
      console.error(`❌ Context ID is missing! GraphQL requests will fail without sc_apikey header.`);
      return;
    }

    // First, try using itemId if available (more reliable)
    // Sitecore's GraphQL accepts GUIDs in the path parameter
    if (wildcardItemId) {
      try {
        console.log(`\n🔍 BEFORE GRAPHQL QUERY - Querying by Item ID`);
        console.log(`   Wildcard Item ID: ${wildcardItemId}`);
        console.log(`   Language: ${language}`);
        console.log(`   Base Edge URL: ${edgeConfig.edgeUrl}`);
        console.log(`   Context ID: ${edgeConfig.contextId ? '***' + edgeConfig.contextId.slice(-4) : 'NOT SET'}`);
        
        // Use direct fetch with exact endpoint format that works in GraphQL IDE
        const response = await makeGraphQLRequest<ChildrenResponse>(
          edgeConfig.edgeUrl,
          GET_CHILDREN_BY_ID_QUERY,
          {
            path: wildcardItemId,
            language: language,
          },
          edgeConfig.contextId
        );

        if (response.item) {
          console.log(`✅ Found wildcard node: ${response.item.name} (${response.item.path || 'path not available'})`);
          const children = response.item.children?.results || [];
          
          if (children.length > 0) {
            console.log(`\n📋 Found ${children.length} child item(s) under wildcard node:\n`);
            children.forEach((child, index) => {
              console.log(`  ${index + 1}. Name: "${child.name}"`);
              console.log(`     ID: ${child.id}`);
              console.log(`     Path: ${child.path}`);
              console.log(`     URL: ${child.url?.path || 'N/A'}`);
              console.log('');
            });
          } else {
            console.log(`\n⚠️  Wildcard node found but has no children\n`);
          }
          return; // Success, exit
        } else {
          console.log(`⚠️  Query succeeded but response.item is null or undefined`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Query by ID failed:`);
        console.error(`   Error message: ${errorMessage}`);
        console.error(`   Error details:`, error);
        // Check if error has response property (e.g., axios error)
        if (error && typeof error === 'object' && 'response' in error) {
          const errorWithResponse = error as { response?: { status?: number; data?: unknown } };
          if (errorWithResponse.response) {
            console.error(`   Response status: ${errorWithResponse.response.status}`);
            console.error(`   Response data:`, errorWithResponse.response.data);
          }
        }
        // Check if error has request property
        if (error && typeof error === 'object' && 'request' in error) {
          const errorWithRequest = error as { request?: unknown };
          if (errorWithRequest.request) {
            console.error(`   Request details:`, errorWithRequest.request);
          }
        }
      }
    }

    // Fallback: try using itemPath if available
    if (wildcardItemPath) {
      // Try different path formats
      const pathFormats = [
        wildcardItemPath,
        wildcardItemPath.replace(/^\//, ''),
        wildcardItemPath.replace(/^\/sitecore\/content\//, ''),
      ];

      for (const pathFormat of pathFormats) {
        try {
          console.log(`\n🔍 BEFORE GRAPHQL QUERY - Querying by Path`);
          console.log(`   Path Format: "${pathFormat}"`);
          console.log(`   Language: ${language}`);
          console.log(`   Base Edge URL: ${edgeConfig.edgeUrl}`);
          console.log(`   Context ID: ${edgeConfig.contextId ? '***' + edgeConfig.contextId.slice(-4) : 'NOT SET'}`);
          
          // Use direct fetch with exact endpoint format that works in GraphQL IDE
          const response = await makeGraphQLRequest<ChildrenResponse>(
            edgeConfig.edgeUrl,
            GET_CHILDREN_BY_PATH_QUERY,
            {
              path: pathFormat,
              language: language,
            },
            edgeConfig.contextId
          );

          if (response.item) {
            console.log(`✅ Found wildcard node: ${response.item.name} (${response.item.path})`);
            const children = response.item.children?.results || [];
            
            if (children.length > 0) {
              console.log(`\n📋 Found ${children.length} child item(s) under wildcard node:\n`);
              children.forEach((child, index) => {
                console.log(`  ${index + 1}. Name: "${child.name}"`);
                console.log(`     ID: ${child.id}`);
                console.log(`     Path: ${child.path}`);
                console.log(`     URL: ${child.url?.path || 'N/A'}`);
                console.log('');
              });
            } else {
              console.log(`\n⚠️  Wildcard node found but has no children\n`);
            }
            return; // Success, exit
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`❌ Path format "${pathFormat}" failed: ${errorMessage}`);
        }
      }
    }

    if (!wildcardItemId && !wildcardItemPath) {
      console.log(`\n❌ Cannot query children: both itemId and itemPath are not available\n`);
    }
  } catch (error) {
    console.error('Error querying wildcard children:', error);
  }
}

/**
 * Resolves a page with wildcard support using Content SDK's built-in wildcard handling.
 * 
 * The Content SDK's getPage method automatically handles wildcard pages:
 * - If a child item exists at the path, it returns that child page
 * - If no child exists, it may return the wildcard page (if one exists in the path hierarchy)
 * 
 * This implementation follows the approach described in:
 * https://www.amitk.net/blog/nextjs-app-router-content-sdk-sitecore-wildcard-pages/
 * 
 * For paths with segments (e.g., ['blog', 'blog-1']), we:
 * 1. Try to get the page with the full path
 * 2. If we get a wildcard page, query and log all children under it for debugging
 * 3. If we get a wildcard page, it means no child exists - return 404
 * 4. If we get a child page, return it
 * 
 * @param path - The requested path segments
 * @param site - The site name
 * @param locale - The locale
 * @param checkExternal - Whether to check external sources (future enhancement)
 * @returns The resolved page or null if not found
 */
export async function resolvePageWithWildcard(
  path: string[],
  site: string,
  locale: string
): Promise<Page | null> {
  try {
    // Early return for Chrome DevTools and other system requests
    if (site === '.well-known' || locale === 'appspecific' || 
        (path && path.some(segment => segment?.includes('devtools') || segment?.includes('chrome') || segment?.includes('.well-known')))) {
      console.log(`   ⚠️  Ignoring system request: site=${site}, locale=${locale}, path=[${path?.join(', ')}]`);
      return null;
    }
    
    // Clean the path - filter out invalid segments like .well-known, devtools, etc.
    const cleanedPath = (path || []).filter(segment => 
      segment && 
      typeof segment === 'string' &&
      !segment.includes('.') && 
      !segment.startsWith('.well-known') &&
      segment !== 'com.chrome.devtools.json' &&
      !segment.includes('devtools') &&
      !segment.includes('chrome')
    );
    
    // Normalize language - ensure it's a valid language code
    const normalizedLocale = locale && locale !== 'appspecific' && locale !== 'undefined' ? locale : 'en';
    
    console.log(`\n🌐 ========================================`);
    console.log(`🌐 resolvePageWithWildcard called:`);
    console.log(`   Original Path: [${path?.join(', ') || 'empty'}]`);
    console.log(`   Cleaned Path: [${cleanedPath.join(', ') || 'empty'}]`);
    console.log(`   Site: ${site}`);
    console.log(`   Original Locale: ${locale}`);
    console.log(`   Normalized Locale: ${normalizedLocale}`);
    console.log(`🌐 ========================================\n`);
    
    // Use cleaned path and normalized locale for all operations
    const finalPath = cleanedPath;
    const finalLocale = normalizedLocale;

    // If path is empty, try to get the root page
    if (!finalPath || finalPath.length === 0) {
      const page = await client.getPage([], { site, locale: finalLocale });
      return page;
    }

    // For paths with segments, try to get the page
    // The Content SDK will return the child page if it exists, or the wildcard page if not
    console.log(`\n📄 Step 1: Attempting to get page with path: [${finalPath.join(', ')}]`);
    console.log(`   Calling: client.getPage([${finalPath.join(', ')}], { site: "${site}", locale: "${finalLocale}" })`);
    
    const page = await client.getPage(finalPath, { site, locale: finalLocale });
    
    console.log(`   getPage result: ${page ? 'Page found' : 'null'}`);
    
    if (!page) {
      console.log(`\n❌ Step 1 failed: getPage returned null`);
      console.log(`   This means the page doesn't exist at the direct path.`);
      console.log(`   We should check if there's a wildcard page that might have children...`);
      
      // Try to find wildcard page and check its children
      console.log(`\n📄 Step 2: Checking for wildcard page...`);
      
      // Try different wildcard path formats
      const wildcardPaths = [
        finalPath.length > 0 ? [finalPath[0], '*'] : ['*'],  // ['blog', '*']
        ['*'],  // Just ['*']
        finalPath.length > 1 ? finalPath.slice(0, -1).concat('*') : ['*'],  // ['blog', '*'] if path is ['blog', 'blog-1']
      ];
      
      let wildcardPage = null;
      const wildcardItemPath = ''; // Not available on RouteData type, kept for compatibility
      let wildcardItemId = '';
      let actualLanguage = finalLocale;
      
      for (const wildcardPath of wildcardPaths) {
        console.log(`   Trying wildcard path: [${wildcardPath.join(', ')}]`);
        wildcardPage = await client.getPage(wildcardPath, { site, locale: finalLocale });
        
        if (wildcardPage) {
          // Note: itemPath is not available on RouteData type, we'll use itemId instead
          // wildcardItemPath will remain undefined and we'll use itemId for GraphQL queries
          wildcardItemId = wildcardPage.layout?.sitecore?.route?.itemId || '';
          const itemName = wildcardPage.layout?.sitecore?.route?.name || '';
          actualLanguage = 
            wildcardPage.layout?.sitecore?.context?.language || 
            finalLocale;
          
          // Normalize the language again in case it's still 'appspecific'
          if (actualLanguage === 'appspecific') {
            actualLanguage = 'en';
          }
          
          console.log(`   ✅ Found wildcard page: ${itemName} (${wildcardItemPath})`);
          console.log(`   Item ID: ${wildcardItemId}`);
          console.log(`   Language: ${actualLanguage}`);
          break;
        } else {
          console.log(`   ❌ No wildcard page found at path: [${wildcardPath.join(', ')}]`);
        }
      }
      
      // If we found a wildcard page, query target site for content
      if (wildcardPage && wildcardItemId) {
        console.log(`\n📄 Step 3: Wildcard page found in current site.`);
        console.log(`   Wildcard Item ID: ${wildcardItemId}`);
        console.log(`   Wildcard Item Path: ${wildcardItemPath}`);
        
        // Query target site for the content (title, description)
        if (TARGET_SITE_NAME && TARGET_SITE_PATH) {
          console.log(`\n📄 Step 4: Querying target site for content...`);
          console.log(`   Target Site: ${TARGET_SITE_NAME}`);
          console.log(`   Target Path: ${TARGET_SITE_PATH}`);
          console.log(`   Requested item: ${finalPath.length > 1 ? finalPath[finalPath.length - 1] : finalPath[0]}`);
          
          const targetPage = await queryTargetSiteAndCreatePage(finalPath, site, finalLocale);
          if (targetPage) {
            console.log(`   ✅ Successfully created page with content from target site!`);
            return targetPage;
          } else {
            console.log(`   ❌ Item not found in target site at specified path`);
            console.log(`   Returning 404 - page not found`);
            return null;
          }
        } else {
          console.log(`\n⚠️  Target site configuration not available.`);
          console.log(`   Please set SITECORE_TARGET_SITE_NAME and SITECORE_TARGET_SITE_PATH environment variables.`);
          console.log(`   Returning 404 - page not found`);
          return null;
        }
      } else {
        console.log(`\n⚠️  Could not find wildcard page with any of the tried paths.`);
        console.log(`   Checking if we should query external target site...`);
        
        // Check if target site configuration is available
        if (TARGET_SITE_NAME && TARGET_SITE_PATH) {
          console.log(`\n📄 Step 3: Querying target site for matching item...`);
          console.log(`   Target Site: ${TARGET_SITE_NAME}`);
          console.log(`   Target Path: ${TARGET_SITE_PATH}`);
          console.log(`   Requested path segment: ${finalPath.length > 1 ? finalPath[1] : finalPath[0]}`);
          
          const targetPage = await queryTargetSiteAndCreatePage(finalPath, site, finalLocale);
          if (targetPage) {
            console.log(`   ✅ Found and created page from target site!`);
            return targetPage;
          } else {
            console.log(`   ❌ Item not found in target site`);
          }
        } else {
          console.log(`   ⚠️  Target site configuration not available.`);
          console.log(`   Please set SITECORE_TARGET_SITE_NAME and SITECORE_TARGET_SITE_PATH environment variables.`);
        }
      }
      
      console.log(`\n❌ Returning 404 - page not found\n`);
      return null;
    }

    // Check if the returned page is a wildcard page
    const itemName = page.layout?.sitecore?.route?.name || '';
    const itemId = page.layout?.sitecore?.route?.itemId || '';
    // Check if this is a wildcard page by checking the name
    const isWildcardPage = itemName === '*';
    
    console.log(`\n📊 Step 1 Result - Page Details:`);
    console.log(`   Item Name: ${itemName}`);
    console.log(`   Item ID: ${itemId}`);
    console.log(`   Is Wildcard Page: ${isWildcardPage}`);
    
    // If we have path segments and got a wildcard page, query and log all children for debugging
    if (isWildcardPage && path.length > 0) {
      console.log(`\n⚠️  Wildcard page returned for path [${path.join(', ')}]`);
      console.log(`   This means no child item was found at the direct path.`);
      console.log(`   Querying all children under wildcard node for validation...\n`);
      
      // Get language from page context
      const actualLanguage = 
        page.layout?.sitecore?.context?.language || 
        locale;
      
      console.log(`   Using language: ${actualLanguage}`);
      
      // Log all children under the wildcard node using itemId (more reliable than path)
      // Note: itemPath is not available on RouteData type, so we pass undefined
      await logWildcardChildren(undefined, itemId, actualLanguage);
      
      console.log(`\n❌ Returning 404 - no child item exists for path [${path.join(', ')}]\n`);
      return null;
    }
    
    // We got a valid child page
    console.log(`\n✅ Successfully resolved to child page:`);
    console.log(`   Name: ${itemName}`);
    console.log(`   ID: ${itemId}\n`);
    return page;
  } catch (error) {
    // If getPage throws an error, the page doesn't exist
    console.error('❌ Error resolving page:', error);
    return null;
  }
}

/**
 * @deprecated This function is no longer needed as Content SDK handles wildcard resolution automatically.
 * Use resolvePageWithWildcard instead.
 */
export async function resolveWildcardPage(
  path: string[],
  site: string,
  locale: string
): Promise<Page | null> {
  // Delegate to the main resolver
  return resolvePageWithWildcard(path, site, locale);
}
