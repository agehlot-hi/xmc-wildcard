'use client';

import React, { JSX } from 'react';
import { ComponentProps } from 'lib/component-props';
import { RichText as ContentSdkRichText, RichTextField } from '@sitecore-content-sdk/nextjs';

interface Fields {
  Text?: RichTextField;
}

export type RichTextProps = ComponentProps & {
  fields: Fields;
};

export const Default = ({ params, fields }: RichTextProps): JSX.Element => {
  const { RenderingIdentifier, styles } = params;

  return (
    <div className={`component rich-text ${styles || ''}`} id={RenderingIdentifier}>
      <div className="component-content">
        {fields?.Text ? (
          <ContentSdkRichText field={fields.Text} />
        ) : (
          <span className="is-empty-hint">Rich text</span>
        )}
      </div>
    </div>
  );
};

export default Default;
