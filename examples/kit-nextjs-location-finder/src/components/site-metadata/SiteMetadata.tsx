import { NoDataFallback } from '@/utils/NoDataFallback';
import { Field } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from '@/lib/component-props';

/**
 * Model used for Sitecore Component integration
 * Note: This component is primarily for Sitecore editing experience.
 * Actual page metadata is set via generateMetadata() in page.tsx for proper SEO.
 */
type SiteMetadataProps = ComponentProps & SiteMetadataFields;

type SiteMetadataFields = {
  fields: {
    title?: Field<string>;
    metadataTitle?: Field<string>;
    metadataKeywords?: Field<string>;
    metadataDescription?: Field<string>;
  };
};

export const Default: React.FC<SiteMetadataProps> = (props) => {
  const { fields } = props;
  
  if (!fields) {
    return <NoDataFallback componentName="Site Metadata" />;
  }

  const title = fields.metadataTitle?.value || fields.title?.value;
  const keywords = fields.metadataKeywords?.value || '';
  const description = fields.metadataDescription?.value || '';

  return (
    <>
      {/* These meta tags are hoisted to <head> by React 19 */}
      {title && <title>{title}</title>}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      {keywords && <meta name="keywords" content={keywords} />}
      {description && <meta name="description" content={description} />}
    </>
  );
};
