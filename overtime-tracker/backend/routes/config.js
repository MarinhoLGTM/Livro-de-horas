const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/config -> valores atuais
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('select valor_hora_atual, valor_vale_alimentacao_atual from config where id = 1');
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao ler configuração.' });
  }
});

// PUT /api/config -> atualizar valores (não afeta registros já lançados)
router.put('/', async (req, res) => {
  const { valorHoraAtual, valorValeAlimentacaoAtual } = req.body;

  if (!valorHoraAtual || !valorValeAlimentacaoAtual) {
    return res.status(400).json({ erro: 'Informe valorHoraAtual e valorValeAlimentacaoAtual.' });
  }

  try {
    const { rows } = await pool.query(
      `update config set valor_hora_atual = $1, valor_vale_alimentacao_atual = $2
       where id = 1 returning valor_hora_atual, valor_vale_alimentacao_atual`,
      [valorHoraAtual, valorValeAlimentacaoAtual]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar configuração.' });
  }
});

module.exports = router;
