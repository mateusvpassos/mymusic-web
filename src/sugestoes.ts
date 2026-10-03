import type { Sugestao } from './cloud';

export function statusTexto(x: Sugestao): string {
  const quem = x.decididoPorNome ? ` por ${x.decididoPorNome}` : '';
  if (x.status === 'aceita') return `aceita${quem}`;
  if (x.status === 'recusada') return `recusada${quem}${x.motivo ? ': ' + x.motivo : ''}`;
  if (x.status === 'cancelada') return 'cancelada';
  return 'esperando';
}
export function statusIcone(st: string): { ic: string; cor: string } {
  if (st === 'aceita') return { ic: 'check_circle', cor: 'var(--ok)' };
  if (st === 'recusada') return { ic: 'cancel', cor: 'var(--error)' };
  if (st === 'cancelada') return { ic: 'remove_circle_outline', cor: 'var(--faint)' };
  return { ic: 'hourglass_top', cor: 'var(--primary)' };
}
