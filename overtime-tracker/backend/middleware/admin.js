function exigirAdmin(req, res, next) {
  if (!req.usuario || req.usuario.papel !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
  }
  next();
}

module.exports = exigirAdmin;
