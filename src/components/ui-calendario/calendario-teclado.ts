import { diaDaSemana, somarDias, somarMeses } from './calendario-datas';
import type { DataSimples } from './tipos';

/**
 * Navegação por teclado do grid de dias (padrão WAI-ARIA "date picker grid").
 * Função pura: devolve a nova data focada ou `null` quando a tecla não é de navegação.
 */
export function proximaDataFoco(tecla: string, atual: DataSimples, inicioSemana: number, shift = false): DataSimples | null {
  switch (tecla) {
    case 'ArrowLeft': return somarDias(atual, -1);
    case 'ArrowRight': return somarDias(atual, 1);
    case 'ArrowUp': return somarDias(atual, -7);
    case 'ArrowDown': return somarDias(atual, 7);
    case 'PageUp': return somarMeses(atual, shift ? -12 : -1);
    case 'PageDown': return somarMeses(atual, shift ? 12 : 1);
    case 'Home': return somarDias(atual, -((diaDaSemana(atual) - inicioSemana + 7) % 7));
    case 'End': return somarDias(atual, 6 - ((diaDaSemana(atual) - inicioSemana + 7) % 7));
    default: return null;
  }
}
