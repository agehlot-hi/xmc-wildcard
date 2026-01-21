// Below are built-in components that are available in the app, it's recommended to keep them as is

import { BYOCServerWrapper, NextjsContentSdkComponent, FEaaSServerWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

// end of built-in components
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
  ['BYOCWrapper', BYOCServerWrapper],
  ['FEaaSWrapper', FEaaSServerWrapper],
  ['Form', Form],
  ['Title', { ...Title, componentType: 'client' }],
  ['SxaHeader', { ...SxaHeader, componentType: 'client' }],
  ['SxaFooter', { ...SxaFooter, componentType: 'client' }],
  ['RichText', { ...RichText, componentType: 'client' }],
  ['Promo', { ...Promo, componentType: 'client' }],
  ['PartialDesignDynamicPlaceholder', { ...PartialDesignDynamicPlaceholder, componentType: 'client' }],
  ['PageContent', { ...PageContent, componentType: 'client' }],
  ['Navigation', { ...Navigation, componentType: 'client' }],
  ['MissingComponent', { ...MissingComponent, componentType: 'client' }],
  ['Image', { ...Image, componentType: 'client' }],
  ['Container', { ...Container, componentType: 'client' }],
]);

export default componentMap;
