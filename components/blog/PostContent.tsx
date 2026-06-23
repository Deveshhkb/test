// Minimal, dependency-free renderer for the limited markdown used in the demo
// content (headings, blockquotes, list items and paragraphs). Swap for a full
// MDX/markdown pipeline when wiring to a real CMS.

export default function PostContent({ content }: { content: string }) {
  const blocks = content.trim().split('\n');

  return (
    <div className="prose-spiritual space-y-4">
      {blocks.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={i} className="pt-2 text-xl font-bold text-royal-950">
              {trimmed.slice(4)}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="pt-4 text-2xl font-bold text-royal-950">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={i}
              className="border-l-4 border-gold-500 bg-gold-50 px-5 py-3 font-display text-lg italic text-royal-900"
            >
              {trimmed.slice(2)}
            </blockquote>
          );
        }
        if (trimmed.startsWith('- ')) {
          return (
            <p key={i} className="flex items-start gap-2 pl-2 text-royal-900/75">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
              {trimmed.slice(2)}
            </p>
          );
        }
        return (
          <p key={i} className="leading-relaxed text-royal-900/75">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
