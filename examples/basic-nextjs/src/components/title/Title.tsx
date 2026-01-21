'use client';

import React, { JSX } from 'react';
import { Link as ContentSdkLink, LinkField, Text, TextField } from '@sitecore-content-sdk/nextjs';
import Link from 'next/link';
import { ComponentProps } from 'lib/component-props';

interface Item {
  url: {
    path: string;
    siteName: string;
  };
  field: {
    jsonValue: {
      value: string;
    };
  };
}

interface TitleProps extends ComponentProps {
  fields: {
    /**
     * The Integrated graphQL query result. This illustrates the way to access the context item datasource information.
     */
    data?: {
      datasource?: Item;
      contextItem?: Item;
    };
  };
}

interface ComponentContentProps {
  id?: string;
  styles?: string;
  children: React.ReactNode;
}

const ComponentContent = ({ id, styles = '', children }: ComponentContentProps): JSX.Element => (
  <div className={`component title ${styles.trim()}`} id={id}>
    <div className="component-content">
      <div className="field-title">{children}</div>
    </div>
  </div>
);

export const Default = ({ params, fields, page }: TitleProps): JSX.Element => {
  const { styles, RenderingIdentifier: id } = params;
  const datasource = fields?.data?.datasource || fields?.data?.contextItem;
  const datasourceField: TextField = datasource?.field?.jsonValue as TextField;
  const contextField: TextField = page.layout.sitecore.route?.fields?.Title as TextField;
  const titleField: TextField = datasourceField || contextField;

  // Only create link if we have a valid path
  const href = datasource?.url?.path;
  const hasValidLink = href && href.trim() !== '' && !page.mode.isEditing;

  const link: LinkField | undefined = hasValidLink && href
    ? {
        value: {
          href: href,
          title:
            (titleField?.value ? String(titleField.value) : undefined) ||
            datasource?.field?.jsonValue?.value ||
            '',
        },
      }
    : undefined;

  return (
    <ComponentContent styles={styles} id={id}>
      {page.mode.isEditing ? (
        hasValidLink && link ? (
          <ContentSdkLink field={link} prefetch={false}>
            <Text field={titleField} />
          </ContentSdkLink>
        ) : (
          <Text field={titleField} />
        )
      ) : hasValidLink && link && link.value.href ? (
        <Link href={link.value.href} prefetch={false}>
          <Text field={titleField} />
        </Link>
      ) : (
        <Text field={titleField} />
      )}
    </ComponentContent>
  );
};

export default Default;
