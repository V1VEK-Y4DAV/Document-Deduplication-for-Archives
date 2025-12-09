import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder = '/placeholder.svg',
  onLoad,
  onError
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [loaded, setLoaded] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let isCancelled = false;
    
    // Create new image to preload
    const img = new Image();
    
    img.onload = () => {
      if (!isCancelled) {
        setImageSrc(src);
        setLoaded(true);
        onLoad?.();
      }
    };
    
    img.onerror = () => {
      if (!isCancelled) {
        onError?.();
      }
    };
    
    // Start loading the actual image
    img.src = src;
    
    // Cleanup function
    return () => {
      isCancelled = true;
    };
  }, [src, onLoad, onError]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${loaded ? 'opacity-100' : 'opacity-70 blur-sm'}`}
      loading="lazy"
      decoding="async"
      onLoad={onLoad}
      onError={onError}
    />
  );
}