-- Enable/normalize RLS policy required for timetable slots.
-- Safe to run multiple times.

-- Timetable slots belong to classes, so scope by class ownership.
drop policy if exists "School isolation: timetable_slots" on timetable_slots;
create policy "School isolation: timetable_slots"
  on timetable_slots for all
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
