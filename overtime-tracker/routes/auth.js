const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

function gerarToken(usuario) {
  return jwt.sign({ id: usuario.id, papel: usuario.papel }, process.env.JWT_SECRET, { expiresIn: '90d' });
}

// POST /api/auth/register -> cria conta (todo mundo nasce como "funcionario")
router.post('/register', async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Informa nome, email e senha.' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha precisa de pelo menos 6 caracteres.' });
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const { rows } = await pool.query(
      `insert into usuarios (nome, email, senha_hash)
       values ($1, $2, $3)
       returning id, nome, email, papel`,
      [nome, email.toLowerCase().trim(), senhaHash]
    );
    const usuario = rows[0];
    const token = gerarToken(usuario);
    res.status(201).json({ token, nome: usuario.nome, papel: usuario.papel });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Já existe uma conta com este email.' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar conta.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informa email e senha.' });
  }

  try {
    const { rows } = await pool.query('select * from usuarios where email = $1', [email.toLowerCase().trim()]);
    const usuario = rows[0];
    if (!usuario) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Email ou senha incorretos.' });
    }

    const token = gerarToken(usuario);
    res.json({ token, nome: usuario.nome, papel: usuario.papel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao entrar.' });
  }
});

module.exports = router;
