'use client';

import React from 'react';
import {
  NextImage as ContentSdkImage,
  Link as ContentSdkLink,
  RichText as ContentSdkRichText,
  ImageField,
  Field,
  LinkField,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

interface Fields {
  PromoIcon?: ImageField;
  PromoText?: Field<string>;
  PromoLink?: LinkField;
  PromoText2?: Field<string>;
}

type PromoProps = ComponentProps & {
  fields?: Fields;
};

interface PromoContentProps extends PromoProps {
  renderText: (fields: Fields) => React.ReactNode;
}

const PromoContent = (props: PromoContentProps): React.JSX.Element => {
  const { fields, params, renderText } = props;
  const { styles, RenderingIdentifier: id } = params;

  const Wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <div className={`component promo ${styles || ''}`} id={id}>
      <div className="component-content">{children}</div>
    </div>
  );

  if (!fields) {
    return (
      <Wrapper>
        <span className="is-empty-hint">Promo</span>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <>
        {fields.PromoIcon && (
          <div className="field-promoicon">
            <ContentSdkImage field={fields.PromoIcon} />
          </div>
        )}
        <div className="promo-text">{renderText(fields)}</div>
      </>
    </Wrapper>
  );
};

export const Default = (props: PromoProps): React.JSX.Element => {
  const renderText = (fields: Fields) => (
    <>
      {fields.PromoText && (
        <div className="field-promotext">
          <ContentSdkRichText field={fields.PromoText} />
        </div>
      )}
      {fields.PromoLink && (
        <div className="field-promolink">
          <ContentSdkLink field={fields.PromoLink} prefetch={false} />
        </div>
      )}
    </>
  );

  return <PromoContent {...props} renderText={renderText} />;
};

export const WithText = (props: PromoProps): React.JSX.Element => {
  const renderText = (fields: Fields) => (
    <>
      {fields.PromoText && (
        <div className="field-promotext">
          <ContentSdkRichText className="promo-text" field={fields.PromoText} />
        </div>
      )}
      {fields.PromoText2 && (
        <div className="field-promotext">
          <ContentSdkRichText className="promo-text" field={fields.PromoText2} />
        </div>
      )}
    </>
  );

  return <PromoContent {...props} renderText={renderText} />;
};

export default Default;
