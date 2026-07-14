-- Dedup infrastructure for the notifications table.
-- Applied to production via Supabase SQL editor on 2026-07-14.

create extension if not exists pg_trgm;

create index if not exists idx_notifications_title_trgm
  on notifications using gin (title gin_trgm_ops);

create or replace function find_similar_notification(
  search_title text,
  threshold float default 0.45
)
returns table (id uuid, slug text, title text, sim_score float)
language sql stable as $$
  select n.id, n.slug, n.title,
         similarity(lower(n.title), lower(search_title)) as sim_score
  from notifications n
  where n.is_active = true
    and similarity(lower(n.title), lower(search_title)) >= threshold
  order by sim_score desc
  limit 1;
$$;

grant execute on function find_similar_notification(text, float)
  to anon, authenticated, service_role;

-- redirect_to: slug of the canonical record a merged duplicate points at (301 in /exam/[id])
alter table notifications add column if not exists redirect_to text;

-- entity_key: normalized org+post+year key; lifecycle variants share one key
alter table notifications add column if not exists entity_key text;
create index if not exists idx_notifications_entity_key on notifications (entity_key);
