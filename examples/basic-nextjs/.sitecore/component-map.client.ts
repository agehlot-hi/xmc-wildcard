// Client-safe component map for App Router

import { BYOCClientWrapper, NextjsContentSdkComponent, FEaaSClientWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

import * as Title from 'src/components/title/Title';
import * as SxaHeader from 'src/components/sxa-header/SxaHeader';
import * as SxaFooter from 'src/components/sxa-footer/SxaFooter';
import * as RichText from 'src/components/rich-text/RichText';
import * as Promo from 'src/components/promo/Promo';
import * as PartialDesignDynamicPlaceholder from 'src/components/partial-design-dynamic-placeholder/PartialDesignDynamicPlaceholder';
import * as PageContent from 'src/components/page-content/PageContent';
import * as Navigation from 'src/components/navigation/Navigation';
import * as MissingComponent from 'src/components/missing-component/MissingComponent';
import * as Image from 'src/components/image/Image';
import * as Container from 'src/components/container/Container';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCClientWrapper],
  ['FEaaSWrapper', FEaaSClientWrapper],
  ['Form', Form],
  ['Title', { ...Title }],
  ['SxaHeader', { ...SxaHeader }],
  ['SxaFooter', { ...SxaFooter }],
  ['RichText', { ...RichText }],
  ['Promo', { ...Promo }],
  ['PartialDesignDynamicPlaceholder', { ...PartialDesignDynamicPlaceholder }],
  ['PageContent', { ...PageContent }],
  ['Navigation', { ...Navigation }],
  ['MissingComponent', { ...MissingComponent }],
  ['Image', { ...Image }],
  ['Container', { ...Container }],
]);

export default componentMap;
