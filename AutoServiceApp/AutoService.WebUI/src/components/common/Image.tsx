/**
 * Reusable image wrapper that enforces a required `alt` attribute
 * for accessibility compliance.
 * @module Image
 */
import type { ImgHTMLAttributes } from 'react';

/** Props for the {@link Image} component. Requires `alt` to be explicitly provided. */
type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> & {
  /** Mandatory alt text for the image. */
  readonly alt: string;
};

/** Thin `<img>` wrapper that enforces a required `alt` prop at the type level. */
export function Image(props: Readonly<ImageProps>) {
  const { alt, ...rest } = props;
  return <img alt={alt} {...rest} />;
}
