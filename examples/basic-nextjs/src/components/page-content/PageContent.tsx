'use client';

import React, { JSX } from 'react';
import { ComponentProps } from 'lib/component-props';
import { RichText as ContentSdkRichText, RichTextField } from '@sitecore-content-sdk/nextjs';

interface Fields {
  Content?: RichTextField;
}

export type PageContentProps = ComponentProps & {
  fields?: Fields;
};

export const Default = ({ params, fields, page }: PageContentProps): JSX.Element => {
  const { styles, RenderingIdentifier: id } = params;

  // Try to get Content field from component fields first, then fall back to route fields
  const field = fields?.Content ?? (page.layout.sitecore.route?.fields?.Content as RichTextField);

  return (
    <div className={`component page-content ${styles || ''}`} id={id}>
      <div className="component-content">
        <div className="field-content">
          {field ? (
            <ContentSdkRichText field={field} />
          ) : (
            <span className="is-empty-hint">Page Content</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Default;
