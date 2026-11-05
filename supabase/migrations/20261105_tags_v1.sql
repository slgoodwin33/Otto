-- Build .80: tags for transactions (#trip, #work-lunch …).
-- Borrowed from Firefly III (tags + tag_transaction_journal pivot) and Monica (tags + contact_tag):
-- one tags table so a rename or color change happens once, and a join table so a purchase can carry many tags.
-- Names are single words (no spaces) because they're typed inline as #name.
create sequence if not exists public.tags_code_seq;
create table public.tags (
  id bigint generated always as identity primary key,
  code text not null unique default ('TG-' || lpad(nextval('public.tags_code_seq')::text, 5, '0')),
  name text not null check (name ~ '^[^\s#@]{1,40}$'),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);
create unique index tags_name_lower_idx on public.tags (lower(name));
create table public.transaction_tags (
  transaction_id bigint not null references public.transactions(id) on delete cascade,
  tag_id bigint not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (transaction_id, tag_id)
);
create index transaction_tags_tag_idx on public.transaction_tags (tag_id);
alter table public.tags enable row level security;
alter table public.transaction_tags enable row level security;
create policy tags_owner_all on public.tags for all
  using (lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'slgoodwin33@gmail.com')
  with check (lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'slgoodwin33@gmail.com');
create policy transaction_tags_owner_all on public.transaction_tags for all
  using (lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'slgoodwin33@gmail.com')
  with check (lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'slgoodwin33@gmail.com');
