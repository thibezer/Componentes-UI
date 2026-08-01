/* ====================================================
   UI Components Kit - Ponto de Entrada Principal (Entrypoint)
   ==================================================== */

// 1. Importação dos Design Tokens Globais
import './tokens/index.css';

// 2. Camada 1: Componentes Fundamentais
export { UIBotaoPrimario } from './components/ui-botao-primario/ui-botao-primario';
export { UIListaFlutuante, UISelect } from './components/ui-lista-flutuante/ui-lista-flutuante';
export { UITexto } from './components/ui-texto/ui-texto';
export { UICampoTexto } from './components/ui-campo-texto/ui-campo-texto';
export { UIIcone } from './components/ui-icone/ui-icone';

// 3. Camada 2: Controles e Seleção de Dados
export { UICheckbox } from './components/ui-checkbox/ui-checkbox';
export { UIRadio } from './components/ui-radio/ui-radio';
export { UISwitch, UIToggle } from './components/ui-switch/ui-switch';
export { UIBadge, UIChip, UITag } from './components/ui-badge/ui-badge';
export { UIAvatar } from './components/ui-avatar/ui-avatar';

// 4. Camada 3: Contêineres, Overlays e Feedback
export { UICard } from './components/ui-card/ui-card';
export { UIModal, UIDialog } from './components/ui-modal/ui-modal';
export { UIAlerta, UIToast } from './components/ui-alerta/ui-alerta';
export { UITooltip, UIPopover } from './components/ui-tooltip/ui-tooltip';
