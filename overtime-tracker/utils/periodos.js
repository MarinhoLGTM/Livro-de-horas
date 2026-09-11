const pad = (n) => String(n).padStart(2, '0');
const toISO = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/**
 * Dado um "mês de referência" (ano, mes 1-12), devolve o período de folha das
 * horas extras: dia 20 do mês anterior até dia 20 do mês de referência.
 * Ex: referência Janeiro/2026 -> 2025-12-20 a 2026-01-20
 */
function getPeriodoFolhaExtras(ano, mes) {
  const mesAnteriorData = new Date(ano, mes - 2, 20); // mes é 1-based; JS Date é 0-based
  const inicio = toISO(mesAnteriorData.getFullYear(), mesAnteriorData.getMonth() + 1, 20);
  const fim = toISO(ano, mes, 20);
  return { inicio, fim };
}

/**
 * Dado um mês de referência, devolve o mês de calendário completo (dia 1 ao último dia).
 */
function getPeriodoMesCalendario(ano, mes) {
  const inicio = toISO(ano, mes, 1);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = toISO(ano, mes, ultimoDia);
  return { inicio, fim };
}

module.exports = { getPeriodoFolhaExtras, getPeriodoMesCalendario };
