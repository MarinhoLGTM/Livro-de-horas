-- SCHEMA NOVO (multiusuário) — usar para uma instalação do ZERO.
-- Se já tens dados de produção, usa o migration.sql em vez deste arquivo.

create table if not exists usuarios (
  id serial primary key,
  nome text not null,
  email text not null unique,
  senha_hash text not null,
  papel text not null default 'funcionario' check (papel in ('funcionario', 'admin')),
  turno text not null default 'normal' check (turno in ('normal', 'terceiro')),
  valor_hora_atual numeric(10,2) not null default 5.88,
  valor_vale_alimentacao_atual numeric(10,2) not null default 10.46,
  created_at timestamptz not null default now()
);

create table if not exists registros (
  id serial primary key,
  usuario_id int not null references usuarios(id) on delete cascade,
  data date not null,
  tipo_dia text not null check (tipo_dia in ('normal', 'sabado', 'feriado')),
  hora_entrada time not null,
  hora_saida time not null,
  horas_trabalhadas numeric(6,2) not null,
  horas_normais numeric(6,2) not null,
  horas_extra_50 numeric(6,2) not null default 0,
  horas_extra_75 numeric(6,2) not null default 0,
  horas_extra_100 numeric(6,2) not null default 0,
  horas_noturnas numeric(6,2) not null default 0,
  percentual_noturno_usado numeric(4,2) not null default 0,
  valor_adicional_noturno numeric(10,2) not null default 0,
  valor_hora_usado numeric(10,2) not null,
  vale_alimentacao_usado numeric(10,2) not null default 0,
  valor_total numeric(10,2) not null,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usuario_id, data)
);

create index if not exists idx_registros_usuario_data on registros (usuario_id, data);

-- Depois de te registares pela primeira vez na app, promove-te a admin com:
-- update usuarios set papel = 'admin' where email = 'teu@email.com';
