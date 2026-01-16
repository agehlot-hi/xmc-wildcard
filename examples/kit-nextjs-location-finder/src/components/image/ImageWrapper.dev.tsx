import { cn } from '@/lib/utils';
import {
  ImageField,
  Image as ContentSdkImage,
  Page,
} from '@sitecore-content-sdk/nextjs';
import NextImage, { ImageProps } from 'next/image';
import placeholderImageLoader from '@/utils/placeholderImageLoader';
import { IMAGE_REMOTE_PATTERNS } from '@/config/image-config';

type ImageWrapperProps = {
  image?: ImageField;
  className?: string;
  priority?: boolean;
  sizes?: string;
  blurDataURL?: string;
  alt?: string;
  wrapperClass?: string;
  isEditing?: boolean;
  isPreview?: boolean;
  page?: Page; // Optional page prop to auto-detect editing mode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export const Default: React.FC<ImageWrapperProps> = (props) => {
  const {
    image,
    className,
    wrapperClass,
    sizes,
    isEditing: propIsEditing,
    isPreview: propIsPreview,
    page,
    priority,
    ...rest
  } = props;

  // Auto-detect editing/preview mode from page if not explicitly provided
  const isEditing = propIsEditing ?? page?.mode?.isEditing ?? false;
  const isPreview = propIsPreview ?? page?.mode?.isPreview ?? false;

  // Read unoptimized setting from environment variable
  const unoptimized = process.env.NEXT_PUBLIC_NEXT_IMAGE_UNOPTIMIZED === 'true';

  if (!isEditing && !image?.value?.src) {
    console.debug('image not found', image);
    return <></>;
  }

  const imageSrc = image?.value?.src ? image?.value?.src : '';
  const isSvg = imageSrc.includes('.svg');
  const isPicsumImage = imageSrc.includes('picsum.photos');

  // Check if image URL matches remotePatterns for optimization
  // Next.js automatically optimizes images that match remotePatterns in next.config.ts
  // If it doesn't match, we'll set unoptimized={true} to allow the image to load
  const shouldOptimize = (src: string): boolean => {
    if (!src.startsWith('http')) {
      // Local images are always optimized by Next.js
      return true;
    }

    try {
      const url = new URL(src);

      const convertToRegex = (pattern: string) => {
        return pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
      };

      return IMAGE_REMOTE_PATTERNS.some((pattern) => {
        const protocolMatch =
          !pattern.protocol || pattern.protocol === url.protocol.slice(0, -1);
        if (!protocolMatch) return false;

        const hostnameRegex = new RegExp(
          '^' + convertToRegex(pattern.hostname) + '$'
        );
        return hostnameRegex.test(url.hostname);
      });
    } catch {
      // Invalid URL, don't optimize
      return false;
    }
  };

  // Determine if image should be unoptimized
  // - Environment variable setting
  // - SVG files (can't be optimized)
  // - External images that don't match remotePatterns
  const isUnoptimized =
    unoptimized ||
    isSvg ||
    (imageSrc.startsWith('http') && !shouldOptimize(imageSrc));

  return (
    <div className={cn('image-container', wrapperClass)}>
      {isEditing || isPreview || isSvg ? (
        <ContentSdkImage field={image} className={className} />
      ) : (
        <NextImage
          key={image?.value?.src}
          loader={isPicsumImage ? placeholderImageLoader : undefined}
          {...(image?.value as ImageProps)}
          className={className}
          unoptimized={isUnoptimized}
          priority={priority}
          sizes={isSvg ? sizes : undefined}
          blurDataURL={image?.value?.src}
          placeholder="blur"
          {...(!image?.value?.width && isSvg ? { width: 16, height: 16 } : {})}
          {...rest}
        />
      )}
    </div>
  );
};
