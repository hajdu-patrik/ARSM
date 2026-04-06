import type { ImgHTMLAttributes } from 'react';

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> & {
  readonly alt: string;
};

export function Image(props: Readonly<ImageProps>) {
  const { alt, ...rest } = props;
  return <img alt={alt} {...rest} />;
}
