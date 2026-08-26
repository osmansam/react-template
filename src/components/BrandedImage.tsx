import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "./Logo";

interface BrandedImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  fallbackSize?: number;
}

export function BrandedImage({
  src,
  alt,
  className = "",
  fallback,
  fallbackSize = 32,
}: BrandedImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return <>{fallback || <Logo size={fallbackSize} />}</>;
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
