const JORNADA_PADRAO = 8; // horas normais por dia
const NOITE_INICIO = 22; // 22h
const NOITE_DURACAO = 9; // 22h -> 07h do dia seguinte = 9 horas

/**
 * Converte "HH:MM" em horas decimais (ex: "08:30" -> 8.5)
 */
function horaParaDecimal(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
}

/**
 * Quantas horas do intervalo [entrada, saidaExt) caem dentro do período noturno
 * (22h-07h), considerando que o turno pode atravessar a meia-noite.
 */
function calcularHorasNoturnas(entrada, saidaExt) {
  let total = 0;
  for (let k = -1; k <= 1; k++) {
    const inicioBloco = NOITE_INICIO + 24 * k;
    const fimBloco = inicioBloco + NOITE_DURACAO;
    const overlap = Math.min(saidaExt, fimBloco) - Math.max(entrada, inicioBloco);
    if (overlap > 0) total += overlap;
  }
  return total;
}

/**
 * Calcula horas trabalhadas e a repartição em normais / extra 50% / extra 75% / extra 100%,
 * mais o adicional noturno, com base no tipo de dia, no turno da pessoa e nos valores vigentes.
 *
 * Regras:
 * - Dia normal: até 8h = horas normais. Acima disso: 1ª hora extra +50%, 2ª hora extra +75%,
 *   da 3ª em diante +100%.
 * - Sábado ou feriado: TODA hora trabalhada é +100%, desde a primeira.
 * - Horas dentro de 22h-07h: adicional noturno de 25% (turno = 'terceiro') ou 15% (turno = 'normal'),
 *   somado por cima do valor calculado acima (não substitui as regras de extra).
 * - Suporta turnos que atravessam a meia-noite (ex: 23:00 às 07:00).
 */
function calcularRegistro({ horaEntrada, horaSaida, tipoDia, turno, valorHora, valorValeAlimentacao }) {
  const entrada = horaParaDecimal(horaEntrada);
  let saida = horaParaDecimal(horaSaida);

  // Turno atravessa a meia-noite (ex: 23:00 -> 07:00): saída "menor" que entrada
  // significa que é no dia seguinte.
  if (saida <= entrada) saida += 24;

  let horasTrabalhadas = saida - entrada;
  if (horasTrabalhadas <= 0) {
    throw new Error('Hora de saída deve ser depois da hora de entrada.');
  }
  horasTrabalhadas = Math.round(horasTrabalhadas * 100) / 100;

  let horasNormais = 0;
  let extra50 = 0;
  let extra75 = 0;
  let extra100 = 0;

  if (tipoDia === 'sabado' || tipoDia === 'feriado') {
    extra100 = horasTrabalhadas;
  } else {
    horasNormais = Math.min(horasTrabalhadas, JORNADA_PADRAO);
    const excedente = Math.max(horasTrabalhadas - JORNADA_PADRAO, 0);
    extra50 = Math.min(excedente, 1);
    extra75 = Math.min(Math.max(excedente - 1, 0), 1);
    extra100 = Math.max(excedente - 2, 0);
  }

  const valorTrabalho =
    horasNormais * valorHora +
    extra50 * valorHora * 1.5 +
    extra75 * valorHora * 1.75 +
    extra100 * valorHora * 2;

  const horasNoturnas = calcularHorasNoturnas(entrada, saida);
  const percentualNoturno = turno === 'terceiro' ? 0.25 : 0.15;
  const valorAdicionalNoturno = horasNoturnas * valorHora * percentualNoturno;

  const valeAlimentacaoUsado = horasTrabalhadas > 0 ? Number(valorValeAlimentacao) : 0;

  const arred2 = (n) => Math.round(n * 100) / 100;

  return {
    horasTrabalhadas: arred2(horasTrabalhadas),
    horasNormais: arred2(horasNormais),
    horasExtra50: arred2(extra50),
    horasExtra75: arred2(extra75),
    horasExtra100: arred2(extra100),
    horasNoturnas: arred2(horasNoturnas),
    percentualNoturno,
    valorAdicionalNoturno: arred2(valorAdicionalNoturno),
    valorTrabalho: arred2(valorTrabalho),
    valeAlimentacaoUsado: arred2(valeAlimentacaoUsado),
    valorTotal: arred2(valorTrabalho + valorAdicionalNoturno + valeAlimentacaoUsado),
  };
}

module.exports = { calcularRegistro, horaParaDecimal, calcularHorasNoturnas, JORNADA_PADRAO };
