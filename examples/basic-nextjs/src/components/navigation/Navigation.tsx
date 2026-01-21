'use client';

import React, { useState } from 'react';
import { Link as ContentSdkLink, LinkField, Text, TextField, useSitecore } from '@sitecore-content-sdk/nextjs';
import Link from 'next/link';
import { ComponentProps } from 'lib/component-props';

interface Fields {
  Id: string;
  DisplayName: string;
  Title?: TextField;
  NavigationTitle?: TextField;
  Href: string;
  Querystring?: string;
  Children?: Array<Fields>;
  Styles?: string[];
}

interface NavigationListItemProps {
  fields: Fields;
  handleClick: (event?: React.MouseEvent<HTMLElement>) => void;
  relativeLevel: number;
}

interface NavigationProps extends ComponentProps {
  fields: Fields | Record<string, Fields>;
}

const getTextContent = (fields: Fields): React.ReactNode => {
  if (fields.NavigationTitle) return <Text field={fields.NavigationTitle} />;
  if (fields.Title) return <Text field={fields.Title} />;
  return fields.DisplayName;
};

const getLinkField = (fields: Fields): LinkField => ({
  value: {
    href: fields.Href,
    title:
      fields.NavigationTitle?.value?.toString() ??
      fields.Title?.value?.toString() ??
      fields.DisplayName,
    querystring: fields.Querystring,
  },
});

const NavigationListItem: React.FC<NavigationListItemProps> = ({
  fields,
  handleClick,
  relativeLevel,
}) => {
  const [isActive, setIsActive] = useState(false);
  const { page } = useSitecore();

  const classNames = [
    ...(fields.Styles || []),
    `rel-level${relativeLevel}`,
    isActive ? 'active' : '',
  ].join(' ');

  const hasChildren = fields.Children && fields.Children.length > 0;
  const children = hasChildren && fields.Children
    ? fields.Children.map((childFields, index) => (
        <NavigationListItem
          key={`${index}-${childFields.Id}`}
          fields={childFields}
          handleClick={handleClick}
          relativeLevel={relativeLevel + 1}
        />
      ))
    : null;

  const linkField = getLinkField(fields);
  const href = linkField.value.href;
  const textContent = getTextContent(fields);

  return (
    <li className={classNames} key={fields.Id} tabIndex={0}>
      <div
        className={`navigation-title ${hasChildren ? 'child' : ''}`}
        onClick={() => setIsActive(!isActive)}
      >
        {page.mode.isEditing ? (
          <ContentSdkLink field={linkField} editable={true} onClick={handleClick}>
            {textContent}
          </ContentSdkLink>
        ) : href ? (
          <Link href={href + (linkField.value.querystring || '')} prefetch={false} onClick={handleClick}>
            {textContent}
          </Link>
        ) : (
          <span onClick={handleClick}>{textContent}</span>
        )}
      </div>
      {hasChildren && <ul className="clearfix">{children}</ul>}
    </li>
  );
};

export const Default = ({ params, fields }: NavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { page } = useSitecore();
  const { styles, RenderingIdentifier: id } = params;

  // Check if fields is empty or has no values
  const fieldsValues = Object.values(fields || {});
  if (!fieldsValues.length || fieldsValues.every((val) => !val)) {
    return (
      <div className={`component navigation ${styles || ''}`} id={id}>
        <div className="component-content">[Navigation]</div>
      </div>
    );
  }

  const handleToggleMenu = (event?: React.MouseEvent<HTMLElement>, forceState?: boolean) => {
    if (event && page.mode.isEditing) {
      event.preventDefault();
    }

    setIsMenuOpen(forceState ?? !isMenuOpen);
  };

  const navigationItems = fieldsValues
    .filter((item): item is Fields => Boolean(item) && typeof item === 'object' && 'Id' in item)
    .map((item: Fields, index) => (
      <NavigationListItem
        key={`${index}-${item.Id}`}
        fields={item}
        handleClick={(event) => handleToggleMenu(event, false)}
        relativeLevel={1}
      />
    ));

  return (
    <div className={`component navigation ${styles || ''}`} id={id}>
      <label className="menu-mobile-navigate-wrapper">
        <input
          type="checkbox"
          className="menu-mobile-navigate"
          checked={isMenuOpen}
          onChange={() => handleToggleMenu()}
        />
        <div className="menu-humburger" />
        <div className="component-content">
          <nav>
            <ul className="clearfix">{navigationItems}</ul>
          </nav>
        </div>
      </label>
    </div>
  );
};

export default Default;
