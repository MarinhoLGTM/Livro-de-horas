const API = '/api';
let token = localStorage.getItem('token') || null;
let papelUsuario = localStorage.getItem('papel') || null;
let dataRef = new Date(); // mês sendo visualizado
let registrosDoMes = {}; // { 'YYYY-MM-DD': registro }
let diaSelecionado = null;
let tipoSelecionado = 'normal';
let config = { valor_hora_atual: 5.88, valor_vale_alimentacao_atual: 10.46 };

const $ = (id) => document.getElementById(id);

// ---------- Auth ----------
async function entrar() {
  const email = $('input-email').value.trim();
  const senha = $('input-senha').value;
  $('login-erro').textContent = '';

  if (!email || !senha) {
    $('login-erro').textContent = 'Preenche email e senha.';
    return;
  }

  try {
    const resp = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.erro || 'Erro ao entrar.');
    guardarSessao(data);
    mostrarApp();
  } catch (err) {
    $('login-erro').textContent = err.message;
  }
}

async function registar() {
  const nome = $('input-nome').value.trim();
  const email = $('input-email').value.trim();
  const senha = $('input-senha').value;
  $('login-erro').textContent = '';

  if (!nome || !email || !senha) {
    $('login-erro').textContent = 'Preenche nome, email e senha.';
    return;
  }

  try {
    const resp = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.erro || 'Erro ao criar conta.');
    guardarSessao(data);
    mostrarApp();
  } catch (err) {
    $('login-erro').textContent = err.message;
  }
}

function guardarSessao(data) {
  token = data.token;
  papelUsuario = data.papel;
  localStorage.setItem('token', token);
  localStorage.setItem('papel', papelUsuario);
  localStorage.setItem('nome', data.nome || '');
}

function mostrarApp() {
  $('tela-login').classList.add('oculto');
  $('app').classList.remove('oculto');
  $('btn-equipa').classList.toggle('oculto', papelUsuario !== 'admin');
  carregarConfig().then(() => carregarMes());
}

async function apiFetch(path, options = {}) {
  const resp = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (resp.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('papel');
    localStorage.removeItem('nome');
    token = null;
    $('app').classList.add('oculto');
    $('tela-login').classList.remove('oculto');
    throw new Error('Sessão expirada.');
  }
  return resp;
}

// ---------- Config ----------
async function carregarConfig() {
  const resp = await apiFetch('/config');
  config = await resp.json();
}

async function salvarConfig() {
  $('config-erro').textContent = '';
  try {
    const valorHoraAtual = Number($('config-valor-hora').value);
    const valorValeAlimentacaoAtual = Number($('config-valor-vale').value);
    const resp = await apiFetch('/config', {
      method: 'PUT',
      body: JSON.stringify({ valorHoraAtual, valorValeAlimentacaoAtual }),
    });
    if (!resp.ok) throw new Error('Erro ao guardar.');
    config = await resp.json();
    $('config-fundo').classList.add('oculto');
  } catch (err) {
    $('config-erro').textContent = err.message;
  }
}

// ---------- Calendário ----------
const NOMES_MES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function isoLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function carregarMes() {
  const ano = dataRef.getFullYear();
  const mes = dataRef.getMonth() + 1;
  $('mes-atual').textContent = `${NOMES_MES[mes - 1]} ${ano}`;

  const resp = await apiFetch(`/relatorio/${ano}/${mes}`);
  const dados = await resp.json();

  registrosDoMes = {};
  [...dados.registrosMes, ...dados.registrosExtras].forEach((r) => {
    registrosDoMes[r.data.slice(0, 10)] = r;
  });

  preencherResumo(dados);
  desenharCalendario(ano, mes);
}

function preencherResumo(dados) {
  const r = dados.resumo;
  $('r-dias').textContent = r.diasTrabalhados;
  $('r-normais').textContent = `${r.totalHorasNormais}h`;
  $('r-vale').textContent = `${fmtEuro(r.totalValeAlimentacao)}`;
  $('r-e50').textContent = `${r.totalExtra50}h`;
  $('r-e75').textContent = `${r.totalExtra75}h`;
  $('r-e100').textContent = `${r.totalExtra100}h`;
  $('r-valor-extras').textContent = fmtEuro(r.valorExtras);
  $('r-total').textContent = fmtEuro(r.valorTotalGeral);
  $('r-periodo-mes').textContent = `horas normais / vale: ${dados.periodoMes.inicio} a ${dados.periodoMes.fim}`;
  $('r-periodo-extras').textContent = `horas extras: ${dados.periodoExtras.inicio} a ${dados.periodoExtras.fim}`;
}

function fmtEuro(n) {
  return Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
}

function desenharCalendario(ano, mes) {
  const grade = $('grade-calendario');
  grade.innerHTML = '';

  const primeiroDia = new Date(ano, mes - 1, 1);
  const offset = primeiroDia.getDay(); // 0 = domingo
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const hojeISO = isoLocal(new Date());

  for (let i = 0; i < offset; i++) {
    const vazio = document.createElement('div');
    vazio.className = 'dia-celula vazio';
    grade.appendChild(vazio);
  }

  for (let d = 1; d <= ultimoDia; d++) {
    const dataAtual = new Date(ano, mes - 1, d);
    const iso = isoLocal(dataAtual);
    const registo = registrosDoMes[iso];

    const celula = document.createElement('div');
    celula.className = 'dia-celula';
    if (iso === hojeISO) celula.classList.add('hoje');

    if (registo) {
      celula.classList.add('tem-registo', `tipo-${registo.tipo_dia}`);
    }

    const num = document.createElement('div');
    num.className = 'dia-num';
    num.textContent = d;
    celula.appendChild(num);

    if (registo) {
      const valor = document.createElement('div');
      valor.className = 'dia-valor ' + corPorRegistro(registo);
      valor.textContent = Number(registo.valor_total).toFixed(0) + '€';
      celula.appendChild(valor);
    }

    if (registo && registo.observacao) {
      const ponto = document.createElement('div');
      ponto.className = 'obs-ponto';
      celula.appendChild(ponto);
    }

    celula.addEventListener('click', () => abrirPainel(iso, registo));
    grade.appendChild(celula);
  }
}

function corPorRegistro(registo) {
  if (registo.tipo_dia === 'sabado' || registo.tipo_dia === 'feriado') return 'tag-100';
  if (Number(registo.horas_extra_100) > 0) return 'tag-100';
  if (Number(registo.horas_extra_75) > 0) return 'tag-75';
  if (Number(registo.horas_extra_50) > 0) return 'tag-50';
  return '';
}

// ---------- Painel do dia ----------
function abrirPainel(iso, registo) {
  diaSelecionado = iso;
  $('painel-data').textContent = new Date(iso + 'T00:00:00').toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  tipoSelecionado = registo ? registo.tipo_dia : 'normal';
  atualizarBotoesTipo();

  $('input-entrada').value = registo ? registo.hora_entrada.slice(0, 5) : '';
  $('input-saida').value = registo ? registo.hora_saida.slice(0, 5) : '';
  $('input-observacao').value = registo ? (registo.observacao || '') : '';

  if (registo) {
    $('painel-resultado').classList.remove('oculto');
    $('pr-total-horas').textContent = `${registo.horas_trabalhadas}h`;
    $('pr-valor').textContent = fmtEuro(registo.valor_total);
    $('btn-apagar-registo').classList.remove('oculto');
  } else {
    $('painel-resultado').classList.add('oculto');
    $('btn-apagar-registo').classList.add('oculto');
  }

  $('painel-erro').textContent = '';
  $('painel-fundo').classList.remove('oculto');
}

function atualizarBotoesTipo() {
  document.querySelectorAll('.tipo-btn').forEach((btn) => {
    btn.classList.toggle('ativo', btn.dataset.tipo === tipoSelecionado);
  });
}

async function salvarRegistro() {
  $('painel-erro').textContent = '';
  const horaEntrada = $('input-entrada').value;
  const horaSaida = $('input-saida').value;
  const observacao = $('input-observacao').value.trim();

  if (!horaEntrada || !horaSaida) {
    $('painel-erro').textContent = 'Preenche entrada e saída.';
    return;
  }

  try {
    const resp = await apiFetch('/registros', {
      method: 'POST',
      body: JSON.stringify({
        data: diaSelecionado,
        tipoDia: tipoSelecionado,
        horaEntrada,
        horaSaida,
        observacao: observacao || null,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.erro || 'Erro ao guardar.');
    }
    $('painel-fundo').classList.add('oculto');
    carregarMes();
  } catch (err) {
    $('painel-erro').textContent = err.message;
  }
}

async function apagarRegistro() {
  if (!confirm('Apagar o registo deste dia?')) return;
  await apiFetch(`/registros/${diaSelecionado}`, { method: 'DELETE' });
  $('painel-fundo').classList.add('oculto');
  carregarMes();
}

// ---------- Equipa (admin) ----------
async function carregarEquipa() {
  const ano = dataRef.getFullYear();
  const mes = dataRef.getMonth() + 1;
  $('equipa-periodo').textContent = `${String(mes).padStart(2, '0')}/${ano}`;
  $('equipa-lista').innerHTML = '<p class="login-subtitulo">A carregar...</p>';

  try {
    const resp = await apiFetch(`/relatorio/${ano}/${mes}/equipa`);
    if (!resp.ok) throw new Error('Erro ao carregar dados da equipa.');
    const dados = await resp.json();

    $('equipa-lista').innerHTML = '';
    dados.funcionarios.forEach((f) => {
      const r = f.resumo;
      const cartao = document.createElement('div');
      cartao.className = 'equipa-cartao';
      cartao.innerHTML = `
        <div class="equipa-nome">${f.nome}<span class="equipa-email">${f.email}</span></div>
        <div class="recibo-linha"><span>Dias trabalhados</span><span class="mono">${r.diasTrabalhados}</span></div>
        <div class="recibo-linha"><span>Horas normais</span><span class="mono">${r.totalHorasNormais}h</span></div>
        <div class="recibo-linha tag-50"><span>Extra 50%</span><span class="mono">${r.totalExtra50}h</span></div>
        <div class="recibo-linha tag-75"><span>Extra 75%</span><span class="mono">${r.totalExtra75}h</span></div>
        <div class="recibo-linha tag-100"><span>Extra 100%</span><span class="mono">${r.totalExtra100}h</span></div>
        <div class="recibo-linha recibo-total"><span>Total geral</span><span class="mono">${fmtEuro(r.valorTotalGeral)}</span></div>
      `;
      $('equipa-lista').appendChild(cartao);
    });

    if (dados.funcionarios.length === 0) {
      $('equipa-lista').innerHTML = '<p class="login-subtitulo">Ainda não há funcionários registados.</p>';
    }
  } catch (err) {
    $('equipa-lista').innerHTML = `<p class="login-erro">${err.message}</p>`;
  }
}

// ---------- Export ----------
function exportar(tipo) {
  const ano = dataRef.getFullYear();
  const mes = dataRef.getMonth() + 1;
  const url = `${API}/relatorio/${ano}/${mes}/${tipo}`;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-${ano}-${String(mes).padStart(2, '0')}.${tipo === 'excel' ? 'xlsx' : 'pdf'}`;
      link.click();
    });
}

// ---------- Eventos ----------
let abaAtual = 'entrar';

function trocarAba(aba) {
  abaAtual = aba;
  $('aba-entrar').classList.toggle('ativo', aba === 'entrar');
  $('aba-registo').classList.toggle('ativo', aba === 'registo');
  $('input-nome').classList.toggle('oculto', aba === 'entrar');
  $('btn-entrar').classList.toggle('oculto', aba !== 'entrar');
  $('btn-registar').classList.toggle('oculto', aba !== 'registo');
  $('login-erro').textContent = '';
}

$('aba-entrar').addEventListener('click', () => trocarAba('entrar'));
$('aba-registo').addEventListener('click', () => trocarAba('registo'));

$('btn-entrar').addEventListener('click', entrar);
$('btn-registar').addEventListener('click', registar);
$('input-senha').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') (abaAtual === 'entrar' ? entrar() : registar());
});

$('btn-equipa').addEventListener('click', () => {
  $('equipa-fundo').classList.remove('oculto');
  carregarEquipa();
});
$('btn-fechar-equipa').addEventListener('click', () => $('equipa-fundo').classList.add('oculto'));

$('mes-anterior').addEventListener('click', () => {
  dataRef.setMonth(dataRef.getMonth() - 1);
  carregarMes();
});
$('mes-seguinte').addEventListener('click', () => {
  dataRef.setMonth(dataRef.getMonth() + 1);
  carregarMes();
});

document.querySelectorAll('.tipo-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    tipoSelecionado = btn.dataset.tipo;
    atualizarBotoesTipo();
  });
});

$('btn-fechar-painel').addEventListener('click', () => $('painel-fundo').classList.add('oculto'));
$('btn-salvar-registo').addEventListener('click', salvarRegistro);
$('btn-apagar-registo').addEventListener('click', apagarRegistro);

$('btn-pdf').addEventListener('click', () => exportar('pdf'));
$('btn-excel').addEventListener('click', () => exportar('excel'));

$('btn-config').addEventListener('click', () => {
  $('config-valor-hora').value = config.valor_hora_atual;
  $('config-valor-vale').value = config.valor_vale_alimentacao_atual;
  $('config-erro').textContent = '';
  $('config-fundo').classList.remove('oculto');
});
$('btn-fechar-config').addEventListener('click', () => $('config-fundo').classList.add('oculto'));
$('btn-salvar-config').addEventListener('click', salvarConfig);

// ---------- Init ----------
if (token) {
  mostrarApp();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
