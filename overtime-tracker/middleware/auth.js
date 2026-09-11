const jwt = require('jsonwebtoken');

/**
 * Verifica o token e anexa req.usuario = { id, papel } vindo do JWT.
 */
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ erro: 'Não autenticado.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.id, papel: payload.papel };
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
  }
}

module.exports = autenticar;
