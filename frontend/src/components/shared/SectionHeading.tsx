import Reveal from './Reveal';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
}

export default function SectionHeading({ eyebrow, title, subtitle, align = 'center' }: Props) {
  return (
    <Reveal className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="mt-3 text-gray-500">{subtitle}</p>}
      <div className={`mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-primary to-secondary ${align === 'center' ? 'mx-auto' : ''}`} />
    </Reveal>
  );
}
