-- MIGRAÇÃO: adicionar turno (normal/terceiro) e adicional noturno.
-- Executa isto no SQL Editor do Supabase (depois de já teres feito a migração multiusuário).

alter table usuarios add column if not exists turno text not null default 'normal'
  check (turno in ('normal', 'terceiro'));

alter table registros add column if not exists horas_noturnas numeric(6,2) not null default 0;
alter table registros add column if not exists percentual_noturno_usado numeric(4,2) not null default 0;
alter table registros add column if not exists valor_adicional_noturno numeric(10,2) not null default 0;

-- Nada mais é preciso: os registos antigos ficam com adicional noturno = 0
-- (não retroage sobre dias já lançados). Define o teu turno em Configurações (⚙) na app.
