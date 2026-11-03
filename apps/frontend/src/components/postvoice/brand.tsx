import { postvoice } from '@gitroom/helpers/postvoice/brand';

export function PostVoiceLogo({ wordmark = false }: { wordmark?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center" aria-label={postvoice.name}>
      <img
        src={wordmark ? '/logo-text.svg' : '/logo.svg'}
        alt={postvoice.name}
        width={wordmark ? 187 : 60}
        height={wordmark ? 40 : 60}
        className="block dark:hidden"
      />
      <img
        src={wordmark ? '/postiz-text.svg' : '/postiz.svg'}
        alt={postvoice.name}
        width={wordmark ? 187 : 60}
        height={wordmark ? 40 : 60}
        className="hidden dark:block"
      />
    </span>
  );
}

export function SourceCodeLink() {
  return (
    <a
      href={postvoice.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[12px] text-textItemBlur underline hover:text-newTextColor"
    >
      Source code
    </a>
  );
}
