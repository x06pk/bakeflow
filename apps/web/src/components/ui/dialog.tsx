import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} onCancel={onClose} aria-label={title} className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card text-foreground border border-border p-0 shadow-xl backdrop:bg-black/50"><div className="sticky top-0 bg-card flex justify-between items-center p-5 border-b border-border z-10"><h2 className="font-semibold text-lg">{title}</h2><Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}><X size={18}/></Button></div><div className="p-5">{children}</div></dialog>;
}
