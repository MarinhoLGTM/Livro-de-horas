-- Executar isto no SQL Editor do Supabase antes de usar a app.

create table if not exists config (
  id int primary key default 1,
  valor_hora_atual numeric(10,2) not null default 5.88,
  valor_vale_alimentacao_atual numeric(10,2) not null default 10.46,
  constraint singleton check (id = 1)
);

insert into config (id, valor_hora_atual, valor_vale_alimentacao_atual)
values (1, 5.88, 10.46)
on conflict (id) do nothing;

create table if not exists registros (
  id serial primary key,
  data date not null unique,
  tipo_dia text not null check (tipo_dia in ('normal', 'sabado', 'feriado')),
  hora_entrada time not null,
  hora_saida time not null,
  horas_trabalhadas numeric(6,2) not null,
  horas_normais numeric(6,2) not null,
  horas_extra_50 numeric(6,2) not null default 0,
  horas_extra_75 numeric(6,2) not null default 0,
  horas_extra_100 numeric(6,2) not null default 0,
  valor_hora_usado numeric(10,2) not null,
  vale_alimentacao_usado numeric(10,2) not null default 0,
  valor_total numeric(10,2) not null,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_registros_data on registros (data);
