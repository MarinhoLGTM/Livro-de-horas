const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/config -> valores do usuário logado
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'select nome, email, papel, valor_hora_atual, valor_vale_alimentacao_atual from usuarios where id = $1',
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao ler configuração.' });
  }
});

// PUT /api/config -> atualizar os próprios valores (não afeta registos já lançados)
router.put('/', async (req, res) => {
  const { valorHoraAtual, valorValeAlimentacaoAtual } = req.body;

  if (!valorHoraAtual || !valorValeAlimentacaoAtual) {
    return res.status(400).json({ erro: 'Informe valorHoraAtual e valorValeAlimentacaoAtual.' });
  }

  try {
    const { rows } = await pool.query(
      `update usuarios set valor_hora_atual = $1, valor_vale_alimentacao_atual = $2
       where id = $3 returning valor_hora_atual, valor_vale_alimentacao_atual`,
      [valorHoraAtual, valorValeAlimentacaoAtual, req.usuario.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar configuração.' });
  }
});

module.exports = router;
