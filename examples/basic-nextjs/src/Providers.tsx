"use client";
import React, { useMemo } from "react";
import {
  ComponentPropsCollection,
  ComponentPropsContext,
  Page,
  SitecoreProvider,
  NextjsContentSdkComponent,
} from "@sitecore-content-sdk/nextjs";
import scConfig from "sitecore.config";
import components from ".sitecore/component-map.client";
import * as MissingComponentModule from "src/components/missing-component/MissingComponent";

/**
 * Enhanced component map that provides MissingComponent as a fallback.
 * This function extracts component names from the page data and ensures
 * they're all registered in the component map to prevent warnings.
 */
function createEnhancedComponentMap(
  baseMap: Map<string, NextjsContentSdkComponent>,
  page: Page
): Map<string, NextjsContentSdkComponent> {
  const enhancedMap = new Map(baseMap);
  
  // Extract all component names from the page layout
  const componentNames = new Set<string>();
  
  function extractComponents(placeholders: Record<string, unknown>) {
    if (!placeholders || typeof placeholders !== 'object') return;
    
    for (const placeholderName in placeholders) {
      const placeholder = placeholders[placeholderName];
      if (Array.isArray(placeholder)) {
        placeholder.forEach((rendering: { componentName?: string; placeholders?: Record<string, unknown> }) => {
          if (rendering?.componentName) {
            componentNames.add(rendering.componentName);
          }
          // Recursively check nested placeholders
          if (rendering?.placeholders) {
            extractComponents(rendering.placeholders);
          }
        });
      }
    }
  }
  
  if (page?.layout?.sitecore?.route?.placeholders) {
    extractComponents(page.layout.sitecore.route.placeholders);
  }
  
  // Add MissingComponent for any components that aren't in the map
  componentNames.forEach((componentName) => {
    if (!enhancedMap.has(componentName)) {
      enhancedMap.set(componentName, MissingComponentModule);
    }
  });
  
  // Add aliases for common component name variations
  // Sitecore may use kebab-case (sxa-header) while components are registered as PascalCase (SxaHeader)
  const componentAliases: Record<string, string> = {
    'sxa-header': 'SxaHeader',
    'sxa-footer': 'SxaFooter',
  };
  
  Object.entries(componentAliases).forEach(([alias, actualName]) => {
    if (enhancedMap.has(actualName) && !enhancedMap.has(alias)) {
      enhancedMap.set(alias, enhancedMap.get(actualName)!);
    }
  });
  
  return enhancedMap;
}

export default function Providers({
  children,
  page,
  componentProps = {},
}: {
  children: React.ReactNode;
  page: Page;
  componentProps?: ComponentPropsCollection;
}) {
  // Create enhanced component map with fallback support for components in the page
  const enhancedComponents = useMemo(
    () => createEnhancedComponentMap(components, page),
    [page]
  );

  return (
    <SitecoreProvider
      api={scConfig.api}
      componentMap={enhancedComponents}
      page={page}
      loadImportMap={() => import(".sitecore/import-map.client")}
    >
      <ComponentPropsContext value={componentProps}>
        {children}
      </ComponentPropsContext>
    </SitecoreProvider>
  );
}
