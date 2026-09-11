-- MIGRAÇÃO: de "app pessoal" para "multiusuário", preservando os teus dados atuais.
-- Executa cada PARTE na ordem, no SQL Editor do Supabase. Lê os comentários.

-- ===== PARTE 1 — criar a tabela de usuários e preparar os registros =====

create table if not exists usuarios (
  id serial primary key,
  nome text not null,
  email text not null unique,
  senha_hash text not null,
  papel text not null default 'funcionario' check (papel in ('funcionario', 'admin')),
  valor_hora_atual numeric(10,2) not null default 5.88,
  valor_vale_alimentacao_atual numeric(10,2) not null default 10.46,
  created_at timestamptz not null default now()
);

alter table registros add column if not exists usuario_id int references usuarios(id) on delete cascade;

-- ===== PARTE 2 — depois de executar a Parte 1, faz o seguinte na APP: =====
-- 1. Abre a app (já com o código novo em produção)
-- 2. Cria a tua conta pela tela de "Criar conta" (o teu nome, o teu email, uma senha)
-- 3. Volta aqui e executa o resto abaixo, trocando 'teu@email.com' pelo email que usaste

update usuarios
set valor_hora_atual = (select valor_hora_atual from config where id = 1),
    valor_vale_alimentacao_atual = (select valor_vale_alimentacao_atual from config where id = 1),
    papel = 'admin'
where email = 'teu@email.com';

update registros
set usuario_id = (select id from usuarios where email = 'teu@email.com')
where usuario_id is null;

-- ===== PARTE 3 — travar a estrutura definitiva (só depois da Parte 2 funcionar) =====

alter table registros alter column usuario_id set not null;
alter table registros drop constraint if exists registros_data_key; -- unicidade antiga (só por data)
alter table registros add constraint registros_usuario_data_key unique (usuario_id, data);
create index if not exists idx_registros_usuario_data on registros (usuario_id, data);

drop table if exists config;
