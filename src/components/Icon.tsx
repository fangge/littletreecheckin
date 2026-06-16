import { type CSSProperties } from 'react';

/** Material Symbols Outlined SVG files we pre-downloaded */
const iconModules = import.meta.glob('../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function getNameFromPath(path: string): string {
  const filename = path.split('/').pop()!;
  return filename.replace('.svg', '');
}

const iconCache: Record<string, string | null> = {};

function getIconSvg(name: string): string | null {
  if (iconCache[name] !== undefined) return iconCache[name];
  for (const [path, svg] of Object.entries(iconModules)) {
    if (getNameFromPath(path) === name) {
      iconCache[name] = svg;
      return svg;
    }
  }
  iconCache[name] = null;
  return null;
}

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Material Symbols icon name, e.g. "check_circle" */
  name: string;
  /** When true, renders the filled variant (default: false, outlined) */
  filled?: boolean;
  /** Override the default size (24px). Pass a string like "20px" or "1em" */
  size?: string;
}

/**
 * Inline SVG icon component pulling from pre-downloaded Material Symbols Outlined.
 * Zero font loading, zero flash-of-unstyled-text — the SVG is always there.
 * Extends HTMLAttributes<HTMLSpanElement> so props like onClick, role, tabIndex,
 * onKeyDown, and aria-label are forwarded to the wrapper <span>.
 */
const Icon = ({
  name,
  className = '',
  filled = false,
  style,
  size,
  ...rest
}: IconProps) => {
  const ariaLabel = rest['aria-label'] as string | undefined;
  const rawSvg = getIconSvg(name);

  if (!rawSvg) {
    console.warn(`[Icon] Unknown icon: "${name}"`);
    return (
      <span
        {...rest}
        className={className}
        style={{ display: 'inline-block', width: size ?? 24, height: size ?? 24, ...style }}
        role="img"
        aria-label={ariaLabel ?? name.replace(/_/g, ' ')}
      />
    );
  }

  // Material Symbols Outlined path geometry uses sub-path winding rules
  // to create the outline look — no fill="none" or stroke needed.
  // Both outlined and filled variants use fill="currentColor" so the
  // icon inherits color from the parent span (Tailwind text-* classes).
  let svgContent = rawSvg.replace(
    /<path\b([^>]*)>/g,
    '<path$1 fill="currentColor">',
  );

  const inner = svgContent
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '')
    .trim();

  const dims = size ?? '24px';

  return (
    <span
      {...rest}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dims,
        height: dims,
        flexShrink: 0,
        ...style,
      }}
      role={rest.role ?? 'img'}
      aria-hidden={rest['aria-hidden'] ?? (!ariaLabel ? true : undefined)}
      aria-label={ariaLabel}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
        width={dims}
        height={dims}
        style={{ display: 'block', width: '100%', height: '100%' }}
        dangerouslySetInnerHTML={{ __html: inner }}
      />
    </span>
  );
};

export default Icon;
