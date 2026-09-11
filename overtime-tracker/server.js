require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const autenticar = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const registrosRoutes = require('./routes/registros');
const configRoutes = require('./routes/config');
const relatorioRoutes = require('./routes/relatorio');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas públicas
app.use('/api/auth', authRoutes);

// Rotas protegidas
app.use('/api/registros', autenticar, registrosRoutes);
app.use('/api/config', autenticar, configRoutes);
app.use('/api/relatorio', autenticar, relatorioRoutes);

// Frontend estático (a mesma app serve o backend e o frontend)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ erro: 'Rota não encontrada.' });
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
