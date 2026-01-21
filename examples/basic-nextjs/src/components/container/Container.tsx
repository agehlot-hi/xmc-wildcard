'use client';

import React from 'react';
import { ComponentProps } from 'lib/component-props';
import { AppPlaceholder } from '@sitecore-content-sdk/nextjs';
import type { NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';

interface ContainerProps extends ComponentProps {
  params: ComponentProps['params'] & {
    BackgroundImage?: string;
    DynamicPlaceholderId?: string;
  };
}

// Lazy load component map function to avoid circular dependency
let componentMapCache: Map<string, NextjsContentSdkComponent> | null = null;
const getComponentMap = (): Map<string, NextjsContentSdkComponent> => {
  if (!componentMapCache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    componentMapCache = require('.sitecore/component-map').default;
  }
  return componentMapCache!; // Non-null assertion: cache is set above if null
};

const Container = ({
  params,
  rendering,
  page,
}: ContainerProps): React.JSX.Element => {
  const {
    styles,
    RenderingIdentifier: id,
    BackgroundImage: backgroundImage,
    DynamicPlaceholderId,
  } = params;
  const phKey = `container-${DynamicPlaceholderId || 'default'}`;

  // Extract the mediaurl from rendering parameters
  const mediaUrlPattern = new RegExp(/mediaurl="([^"]*)"/, 'i');

  let backgroundStyle: { [key: string]: string } = {};

  if (backgroundImage && backgroundImage.match(mediaUrlPattern)) {
    const mediaUrl = backgroundImage.match(mediaUrlPattern)?.[1] || '';

    backgroundStyle = {
      backgroundImage: `url('${mediaUrl}')`,
    };
  }

  return (
    <div className={`component container-default ${styles || ''}`} id={id}>
      <div className="component-content" style={backgroundStyle}>
        <div className="row">
          <AppPlaceholder
            name={phKey}
            rendering={rendering}
            page={page}
            componentMap={getComponentMap()}
          />
        </div>
      </div>
    </div>
  );
};

export const Default = ({ params, rendering, page }: ContainerProps): React.JSX.Element => {
  const styles = params?.styles?.split(' ');

  return styles?.includes('container') ? (
    <div className="container-wrapper">
      <Container params={params} rendering={rendering} page={page} />
    </div>
  ) : (
    <Container params={params} rendering={rendering} page={page} />
  );
};

export default Default;
