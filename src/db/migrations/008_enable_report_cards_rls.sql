-- Enable/normalize RLS policy required for report cards.
-- Safe to run multiple times.

alter table report_cards enable row level security;

drop policy if exists "School isolation: report_cards" on report_cards;
create policy "School isolation: report_cards"
  on report_cards for all
  using (
    class_id in (
      select id from classes where school_id = get_my_school_id()
    )
  )
  with check (
    class_id in (
      select id from classes where school_id = get_my_school_id()
    )
  );
