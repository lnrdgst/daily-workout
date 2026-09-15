import { ArrowLeft } from 'lucide-react';

export const ViewBackButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick}
    className="inline-flex min-h-12 items-center gap-2 px-2 py-2 text-sm font-medium text-accent-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500">
    <ArrowLeft size={18} aria-hidden="true" />
    Voltar
  </button>
);
