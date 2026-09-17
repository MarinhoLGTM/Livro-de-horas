const express = require('express');
const pool = require('../db');
const { calcularRegistro } = require('../utils/calculo');

const router = express.Router();

async function getConfigDoUsuario(usuarioId) {
  const { rows } = await pool.query(
    'select valor_hora_atual, valor_vale_alimentacao_atual, turno from usuarios where id = $1',
    [usuarioId]
  );
  return rows[0];
}

// GET /api/registros?inicio=YYYY-MM-DD&fim=YYYY-MM-DD -> só do usuário logado
router.get('/', async (req, res) => {
  const { inicio, fim } = req.query;
  try {
    let query = 'select * from registros where usuario_id = $1';
    const params = [req.usuario.id];
    if (inicio && fim) {
      query += ' and data between $2 and $3';
      params.push(inicio, fim);
    }
    query += ' order by data asc';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar registros.' });
  }
});

// GET /api/registros/:data
router.get('/:data', async (req, res) => {
  try {
    const { rows } = await pool.query('select * from registros where usuario_id = $1 and data = $2', [
      req.usuario.id,
      req.params.data,
    ]);
    if (rows.length === 0) return res.status(404).json({ erro: 'Sem registro nesse dia.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar registro.' });
  }
});

// POST /api/registros -> criar ou substituir o registro de um dia (sempre do usuário logado)
router.post('/', async (req, res) => {
  const { data, tipoDia, horaEntrada, horaSaida, observacao } = req.body;

  if (!data || !tipoDia || !horaEntrada || !horaSaida) {
    return res.status(400).json({ erro: 'Informe data, tipoDia, horaEntrada e horaSaida.' });
  }
  if (!['normal', 'sabado', 'feriado'].includes(tipoDia)) {
    return res.status(400).json({ erro: 'tipoDia inválido.' });
  }

  try {
    const config = await getConfigDoUsuario(req.usuario.id);
    const calculo = calcularRegistro({
      horaEntrada,
      horaSaida,
      tipoDia,
      turno: config.turno,
      valorHora: config.valor_hora_atual,
      valorValeAlimentacao: config.valor_vale_alimentacao_atual,
    });

    const { rows } = await pool.query(
      `insert into registros
        (usuario_id, data, tipo_dia, hora_entrada, hora_saida, horas_trabalhadas, horas_normais,
         horas_extra_50, horas_extra_75, horas_extra_100, horas_noturnas, percentual_noturno_usado,
         valor_adicional_noturno, valor_hora_usado, vale_alimentacao_usado, valor_total, observacao, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now())
       on conflict (usuario_id, data) do update set
         tipo_dia = excluded.tipo_dia,
         hora_entrada = excluded.hora_entrada,
         hora_saida = excluded.hora_saida,
         horas_trabalhadas = excluded.horas_trabalhadas,
         horas_normais = excluded.horas_normais,
         horas_extra_50 = excluded.horas_extra_50,
         horas_extra_75 = excluded.horas_extra_75,
         horas_extra_100 = excluded.horas_extra_100,
         horas_noturnas = excluded.horas_noturnas,
         percentual_noturno_usado = excluded.percentual_noturno_usado,
         valor_adicional_noturno = excluded.valor_adicional_noturno,
         valor_hora_usado = excluded.valor_hora_usado,
         vale_alimentacao_usado = excluded.vale_alimentacao_usado,
         valor_total = excluded.valor_total,
         observacao = excluded.observacao,
         updated_at = now()
       returning *`,
      [
        req.usuario.id,
        data,
        tipoDia,
        horaEntrada,
        horaSaida,
        calculo.horasTrabalhadas,
        calculo.horasNormais,
        calculo.horasExtra50,
        calculo.horasExtra75,
        calculo.horasExtra100,
        calculo.horasNoturnas,
        calculo.percentualNoturno,
        calculo.valorAdicionalNoturno,
        config.valor_hora_atual,
        calculo.valeAlimentacaoUsado,
        calculo.valorTotal,
        observacao || null,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message || 'Erro ao salvar registro.' });
  }
});

// DELETE /api/registros/:data
router.delete('/:data', async (req, res) => {
  try {
    await pool.query('delete from registros where usuario_id = $1 and data = $2', [req.usuario.id, req.params.data]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao apagar registro.' });
  }
});

module.exports = router;
