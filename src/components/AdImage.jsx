import { useState } from 'react';

const PLACEHOLDER = 'https://via.placeholder.com/400x240?text=No+image';

export default function AdImage({ src, alt, className }) {
  const [error, setError] = useState(false);
  const url = src && (typeof src === 'string' ? src : src?.url) ? (typeof src === 'string' ? src : src.url) : null;
  const displayUrl = error || !url ? PLACEHOLDER : url;

  return (
    <img
      src={displayUrl}
      alt={alt || 'Ad'}
      className={className}
      onError={() => setError(true)}
    />
  );
}
