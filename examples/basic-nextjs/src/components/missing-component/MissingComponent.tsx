'use client';

import React, { JSX } from 'react';
import { useSitecore } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

type MissingComponentProps = ComponentProps;

/**
 * Fallback component for Sitecore components that don't have React implementations.
 * This prevents the "Content SDK component is missing React implementation" warning
 * and provides a helpful message in editing mode.
 */
export const Default = (props: MissingComponentProps): JSX.Element | null => {
  const { page } = useSitecore();
  const { isEditing } = page.mode;
  // Extract component name from rendering
  const componentName = props.rendering?.componentName || 'Unknown';

  if (isEditing) {
    return (
      <div
        style={{
          padding: '20px',
          border: '2px dashed #ccc',
          backgroundColor: '#f9f9f9',
          margin: '10px 0',
        }}
      >
        <p style={{ margin: 0, color: '#666' }}>
          <strong>Component &quot;{componentName}&quot;</strong> is not implemented in this starter.
        </p>
        <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#999' }}>
          To use this component, create a React implementation at:{' '}
          <code>src/components/{componentName.toLowerCase().replace(/\s+/g, '-')}/{componentName}.tsx</code>
        </p>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#999' }}>
          After creating the component, run: <code>npm run sitecore-tools:generate-map</code>
        </p>
      </div>
    );
  }

  // In preview/published mode, render nothing for missing components
  return null;
};

export default Default;
