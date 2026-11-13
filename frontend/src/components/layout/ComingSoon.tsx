import React from 'react';
import { ArrowLeft, Construction } from 'lucide-react';

export default function ComingSoon({ title, description, onBack }: { title: string; description: string; onBack: () => void }) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-12 pb-28 lg:pb-12">
      <section className="nova-card mx-auto max-w-2xl p-8 sm:p-12 text-center">
        <Construction className="mx-auto h-12 w-12 text-nova-sky drop-shadow-[0_0_14px_rgba(79,176,255,0.7)]" aria-hidden />
        <h1 className="mt-5 font-display text-3xl font-bold text-white">{title}</h1>
        <p className="mt-3 text-lg text-slate-300">{description}</p>
        <button type="button" onClick={onBack} className="nova-btn-outline mt-8">
          <ArrowLeft className="h-5 w-5" aria-hidden /> Retour à l&apos;accueil
        </button>
      </section>
    </div>
  );
}
