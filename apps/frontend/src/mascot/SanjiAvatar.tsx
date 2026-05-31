import { avatarDataUrl } from './avatarImage';

export interface SanjiAvatarProps {
  size?: number;
}

// Static face avatar beside an assistant reply. Reuses one cached data URL
// across every message. Falls back to a soft accent dot if no canvas context
// is available (jsdom / headless), so rows never render a broken image.
export function SanjiAvatar({ size = 28 }: SanjiAvatarProps) {
  const src = avatarDataUrl();
  if (!src) {
    return (
      <div
        role="img"
        aria-label="Sanji"
        className="shrink-0 rounded-full bg-primary/15"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="Sanji"
      className="shrink-0 rounded-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
