const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const pool = require('../db');
const { getPeriodoFolhaExtras, getPeriodoMesCalendario } = require('../utils/periodos');
const exigirAdmin = require('../middleware/admin');

const router = express.Router();

function round2(n) {
  return Math.round(n * 100) / 100;
}

function calcularResumo(registrosExtras, registrosMes) {
  const totalExtra50 = registrosExtras.reduce((s, r) => s + Number(r.horas_extra_50), 0);
  const totalExtra75 = registrosExtras.reduce((s, r) => s + Number(r.horas_extra_75), 0);
  const totalExtra100 = registrosExtras.reduce((s, r) => s + Number(r.horas_extra_100), 0);
  const valorExtras = registrosExtras.reduce((s, r) => {
    const vh = Number(r.valor_hora_usado);
    return s + Number(r.horas_extra_50) * vh * 1.5 + Number(r.horas_extra_75) * vh * 1.75 + Number(r.horas_extra_100) * vh * 2;
  }, 0);

  const totalHorasNormais = registrosMes.reduce((s, r) => s + Number(r.horas_normais), 0);
  const diasTrabalhados = registrosMes.length;
  const totalValeAlimentacao = registrosMes.reduce((s, r) => s + Number(r.vale_alimentacao_usado), 0);
  const valorHorasNormais = registrosMes.reduce((s, r) => s + Number(r.horas_normais) * Number(r.valor_hora_usado), 0);

  return {
    diasTrabalhados,
    totalHorasNormais: round2(totalHorasNormais),
    totalExtra50: round2(totalExtra50),
    totalExtra75: round2(totalExtra75),
    totalExtra100: round2(totalExtra100),
    valorHorasNormais: round2(valorHorasNormais),
    valorExtras: round2(valorExtras),
    totalValeAlimentacao: round2(totalValeAlimentacao),
    valorTotalGeral: round2(valorHorasNormais + valorExtras + totalValeAlimentacao),
  };
}

async function buscarDadosMes(usuarioId, ano, mes) {
  const periodoExtras = getPeriodoFolhaExtras(ano, mes);
  const periodoMes = getPeriodoMesCalendario(ano, mes);

  const [regExtras, regMes] = await Promise.all([
    pool.query('select * from registros where usuario_id = $1 and data between $2 and $3 order by data', [
      usuarioId, periodoExtras.inicio, periodoExtras.fim,
    ]),
    pool.query('select * from registros where usuario_id = $1 and data between $2 and $3 order by data', [
      usuarioId, periodoMes.inicio, periodoMes.fim,
    ]),
  ]);

  return {
    periodoExtras,
    periodoMes,
    registrosExtras: regExtras.rows,
    registrosMes: regMes.rows,
    resumo: calcularResumo(regExtras.rows, regMes.rows),
  };
}

// GET /api/relatorio/:ano/:mes -> resumo pessoal (do usuário logado)
router.get('/:ano/:mes', async (req, res) => {
  try {
    const dados = await buscarDadosMes(req.usuario.id, Number(req.params.ano), Number(req.params.mes));
    res.json(dados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar relatório.' });
  }
});

// GET /api/relatorio/:ano/:mes/equipa -> resumo de TODOS os funcionários (só admin)
router.get('/:ano/:mes/equipa', exigirAdmin, async (req, res) => {
  const ano = Number(req.params.ano);
  const mes = Number(req.params.mes);
  try {
    const { rows: usuarios } = await pool.query('select id, nome, email from usuarios order by nome');
    const resumos = await Promise.all(
      usuarios.map(async (u) => {
        const dados = await buscarDadosMes(u.id, ano, mes);
        return { id: u.id, nome: u.nome, email: u.email, resumo: dados.resumo };
      })
    );
    res.json({ periodoReferencia: `${mes}/${ano}`, funcionarios: resumos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar relatório da equipa.' });
  }
});

// GET /api/relatorio/:ano/:mes/pdf
router.get('/:ano/:mes/pdf', async (req, res) => {
  const ano = Number(req.params.ano);
  const mes = Number(req.params.mes);
  try {
    const dados = await buscarDadosMes(req.usuario.id, ano, mes);
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${ano}-${String(mes).padStart(2, '0')}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).text(`Relatório de horas — ${String(mes).padStart(2, '0')}/${ano}`, { align: 'left' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#555').text(`Período horas normais / vale alimentação: ${dados.periodoMes.inicio} a ${dados.periodoMes.fim}`);
    doc.text(`Período horas extras: ${dados.periodoExtras.inicio} a ${dados.periodoExtras.fim}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#000').text('Resumo do mês', { underline: true });
    doc.fontSize(10).moveDown(0.5);
    const r = dados.resumo;
    doc.text(`Dias trabalhados: ${r.diasTrabalhados}`);
    doc.text(`Horas normais: ${r.totalHorasNormais}h — ${r.valorHorasNormais}€`);
    doc.text(`Vale alimentação: ${r.totalValeAlimentacao}€`);
    doc.text(`Horas extra 50%: ${r.totalExtra50}h`);
    doc.text(`Horas extra 75%: ${r.totalExtra75}h`);
    doc.text(`Horas extra 100%: ${r.totalExtra100}h`);
    doc.text(`Valor total das horas extras: ${r.valorExtras}€`);
    doc.fontSize(12).text(`Valor total geral: ${r.valorTotalGeral}€`, { underline: true });
    doc.moveDown();

    doc.fontSize(12).text('Registos do mês (horas normais / vale)', { underline: true });
    doc.fontSize(9).moveDown(0.5);
    dados.registrosMes.forEach((reg) => {
      doc.text(
        `${reg.data} | ${reg.tipo_dia} | ${reg.hora_entrada}-${reg.hora_saida} | normais: ${reg.horas_normais}h | vale: ${reg.vale_alimentacao_usado}€${reg.observacao ? ' | obs: ' + reg.observacao : ''}`
      );
    });

    doc.moveDown();
    doc.fontSize(12).text('Registos do período de extras', { underline: true });
    doc.fontSize(9).moveDown(0.5);
    dados.registrosExtras.forEach((reg) => {
      doc.text(
        `${reg.data} | 50%: ${reg.horas_extra_50}h | 75%: ${reg.horas_extra_75}h | 100%: ${reg.horas_extra_100}h`
      );
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar PDF.' });
  }
});

// GET /api/relatorio/:ano/:mes/excel
router.get('/:ano/:mes/excel', async (req, res) => {
  const ano = Number(req.params.ano);
  const mes = Number(req.params.mes);
  try {
    const dados = await buscarDadosMes(req.usuario.id, ano, mes);
    const workbook = new ExcelJS.Workbook();

    const sheetMes = workbook.addWorksheet('Horas normais e vale');
    sheetMes.columns = [
      { header: 'Data', key: 'data', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 10 },
      { header: 'Entrada', key: 'entrada', width: 10 },
      { header: 'Saída', key: 'saida', width: 10 },
      { header: 'Horas normais', key: 'normais', width: 14 },
      { header: 'Vale alimentação (€)', key: 'vale', width: 18 },
      { header: 'Observação', key: 'obs', width: 30 },
    ];
    dados.registrosMes.forEach((r) => {
      sheetMes.addRow({
        data: r.data, tipo: r.tipo_dia, entrada: r.hora_entrada, saida: r.hora_saida,
        normais: Number(r.horas_normais), vale: Number(r.vale_alimentacao_usado), obs: r.observacao || '',
      });
    });

    const sheetExtras = workbook.addWorksheet('Horas extras');
    sheetExtras.columns = [
      { header: 'Data', key: 'data', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 10 },
      { header: 'Extra 50% (h)', key: 'e50', width: 14 },
      { header: 'Extra 75% (h)', key: 'e75', width: 14 },
      { header: 'Extra 100% (h)', key: 'e100', width: 14 },
    ];
    dados.registrosExtras.forEach((r) => {
      sheetExtras.addRow({
        data: r.data, tipo: r.tipo_dia, e50: Number(r.horas_extra_50), e75: Number(r.horas_extra_75), e100: Number(r.horas_extra_100),
      });
    });

    const sheetResumo = workbook.addWorksheet('Resumo');
    sheetResumo.columns = [{ header: 'Item', key: 'item', width: 30 }, { header: 'Valor', key: 'valor', width: 20 }];
    Object.entries(dados.resumo).forEach(([k, v]) => sheetResumo.addRow({ item: k, valor: v }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${ano}-${String(mes).padStart(2, '0')}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar Excel.' });
  }
});

module.exports = router;
