const JORNADA_PADRAO = 8; // horas normais por dia

/**
 * Converte "HH:MM" em horas decimais (ex: "08:30" -> 8.5)
 */
function horaParaDecimal(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
}

/**
 * Calcula horas trabalhadas e a repartição em normais / extra 50% / extra 75% / extra 100%,
 * com base no tipo de dia e nos valores (hora e vale alimentação) vigentes.
 *
 * Regras:
 * - Dia normal: até 8h = horas normais. Acima disso: 1ª hora extra +50%, 2ª hora extra +75%,
 *   da 3ª em diante +100%.
 * - Sábado ou feriado: TODA hora trabalhada é +100%, desde a primeira.
 */
function calcularRegistro({ horaEntrada, horaSaida, tipoDia, valorHora, valorValeAlimentacao }) {
  const entrada = horaParaDecimal(horaEntrada);
  const saida = horaParaDecimal(horaSaida);
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

  const valorTotal =
    horasNormais * valorHora +
    extra50 * valorHora * 1.5 +
    extra75 * valorHora * 1.75 +
    extra100 * valorHora * 2;

  const valeAlimentacaoUsado = horasTrabalhadas > 0 ? Number(valorValeAlimentacao) : 0;

  const arred2 = (n) => Math.round(n * 100) / 100;

  return {
    horasTrabalhadas: arred2(horasTrabalhadas),
    horasNormais: arred2(horasNormais),
    horasExtra50: arred2(extra50),
    horasExtra75: arred2(extra75),
    horasExtra100: arred2(extra100),
    valorTotal: arred2(valorTotal + valeAlimentacaoUsado),
    valorTrabalho: arred2(valorTotal),
    valeAlimentacaoUsado: arred2(valeAlimentacaoUsado),
  };
}

module.exports = { calcularRegistro, horaParaDecimal, JORNADA_PADRAO };
