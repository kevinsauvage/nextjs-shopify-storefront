'use client';

import { startTransition, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

import { cn } from '@/utils/cn';

import { Skeleton } from './ui/skeleton';

type OptimizedImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
  preload?: boolean;
  className?: string;
  sizes?: string;
  quality?: number;
  fill?: boolean;
  onError?: () => void;
  fallbackSrc?: string;
};

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  blurDataURL,
  preload = false,
  className,
  sizes,
  quality = 75,
  fill = false,
  onError,
  fallbackSrc = PLACEHOLDER_IMAGE,
}: OptimizedImageProps) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [errorSrc, setErrorSrc] = useState<string | null>(null);
  const prevSrcRef = useRef(src);

  // Reset state when src changes (using startTransition to avoid cascading renders)
  useEffect(() => {
    if (src !== prevSrcRef.current) {
      prevSrcRef.current = src;
      startTransition(() => {
        setImageLoading(true);
        setImageError(false);
        setErrorSrc(null);
      });
    }
  }, [src]);

  const handleError = () => {
    setImageError(true);
    setImageLoading(false);
    setErrorSrc(fallbackSrc);
    onError?.();
  };

  const handleLoad = () => {
    setImageLoading(false);
    setImageError(false);
    setErrorSrc(null);
  };

  // Generate responsive sizes if not provided
  const responsiveSizes =
    sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw';

  // Default dimensions for aspect ratio if not provided
  // Reduced from 800x800 to 500x500 for better performance
  const defaultWidth = width || 500;
  const defaultHeight = height || 500;

  const containerClassName = fill
    ? cn('absolute inset-0 overflow-hidden', className)
    : cn('relative overflow-hidden', className);

  return (
    <div className={containerClassName}>
      {imageLoading && !imageError && (
        <Skeleton className="absolute inset-0 z-10 rounded-none skeleton-shimmer" />
      )}
      {blurDataURL && imageLoading && !imageError && (
        <Image
          key={`blur-${src}`}
          src={blurDataURL}
          alt=""
          fill
          width={undefined}
          height={undefined}
          className="absolute inset-0 z-0 object-cover blur-xl scale-110"
          aria-hidden="true"
          unoptimized
        />
      )}
      <Image
        key={src}
        src={errorSrc || src}
        alt={alt}
        width={fill ? undefined : defaultWidth}
        height={fill ? undefined : defaultHeight}
        fill={fill}
        preload={preload}
        quality={quality}
        sizes={responsiveSizes}
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
        className={cn(
          'transition-opacity duration-300 object-cover',
          imageLoading && !imageError ? 'opacity-0' : 'opacity-100',
          fill ? 'w-full h-full' : '',
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={preload ? undefined : 'lazy'}
      />
    </div>
  );
};

export default OptimizedImage;
