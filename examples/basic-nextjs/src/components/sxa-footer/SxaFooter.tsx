'use client';

import React, { JSX } from 'react';
import { ComponentProps } from 'lib/component-props';
import { AppPlaceholder } from '@sitecore-content-sdk/nextjs';

// Lazy load component map function to avoid circular dependency
import type { NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';

let componentMapCache: Map<string, NextjsContentSdkComponent> | null = null;
const getComponentMap = (): Map<string, NextjsContentSdkComponent> => {
  if (!componentMapCache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    componentMapCache = require('.sitecore/component-map').default;
  }
  return componentMapCache!; // Non-null assertion: cache is set above if null
};

export const Default = (props: ComponentProps): JSX.Element => {
  const { rendering, page } = props;

  return (
    <div className="component sxa-footer">
      <div className="component-content">
        <AppPlaceholder
          name="footer"
          rendering={rendering}
          page={page}
          componentMap={getComponentMap()}
        />
      </div>
    </div>
  );
};

export default Default;
