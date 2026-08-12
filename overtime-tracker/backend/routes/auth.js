const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/login', (req, res) => {
  const { senha } = req.body;

  if (!senha || senha !== process.env.APP_PASSWORD) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }

  const token = jwt.sign({ user: 'caio' }, process.env.JWT_SECRET, { expiresIn: '90d' });
  res.json({ token });
});

module.exports = router;
