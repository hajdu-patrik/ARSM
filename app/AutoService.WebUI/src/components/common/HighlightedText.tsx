import { highlightSegments } from '../../utils/textSearch';

interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
}

/** Renders text with the parts matching the query in the vivid accent text color (no background, no weight change). */
export function HighlightedText({ text, query, className }: Readonly<HighlightedTextProps>) {
  const segments = highlightSegments(text, query);

  return (
    <span className={className}>
      {segments.map((segment, index) => (segment.matched
        ? <span key={`${String(index)}-m`} className="text-arsm-accent-vivid dark:text-arsm-accent">{segment.text}</span>
        : <span key={`${String(index)}-p`}>{segment.text}</span>))}
    </span>
  );
}
