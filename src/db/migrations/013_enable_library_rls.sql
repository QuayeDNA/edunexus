-- Enable/normalize schema + RLS policies required for library module tables.
-- Safe to run multiple times.

create or replace function get_my_school_id()
returns uuid
language sql
stable
as $$
  select school_id from profiles where id = auth.uid()
$$;

-- Library tables (created if missing)
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  title text not null,
  author text,
  isbn text,
  publisher text,
  publication_year int,
  category text,
  subject_id uuid references subjects(id),
  total_copies int default 1,
  available_copies int default 1,
  location text,
  cover_url text,
  description text
);

create table if not exists book_loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id),
  borrower_id uuid references profiles(id),
  borrowed_date date not null,
  due_date date not null,
  returned_date date,
  status text default 'Borrowed' check (status in ('Borrowed','Returned','Overdue','Lost')),
  fine_amount numeric default 0,
  issued_by uuid references profiles(id)
);

create table if not exists library_resources (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  title text not null,
  resource_type text default 'PDF' check (resource_type in ('PDF','Document','Past Paper','Textbook','Notes','Other')),
  subject_id uuid references subjects(id),
  grade_level_id uuid references grade_levels(id),
  file_url text not null,
  description text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Helpful indexes for library lookups
create index if not exists idx_books_school_title on books(school_id, title);
create index if not exists idx_books_school_category on books(school_id, category);
create index if not exists idx_books_subject_id on books(subject_id);
create index if not exists idx_book_loans_book_id on book_loans(book_id);
create index if not exists idx_book_loans_borrower_id on book_loans(borrower_id);
create index if not exists idx_book_loans_status_due_date on book_loans(status, due_date);
create index if not exists idx_library_resources_school_created on library_resources(school_id, created_at desc);
create index if not exists idx_library_resources_subject_grade on library_resources(subject_id, grade_level_id);

-- Enable row level security
alter table books enable row level security;
alter table book_loans enable row level security;
alter table library_resources enable row level security;

-- Books are school-scoped directly
 drop policy if exists "School isolation: books" on books;
create policy "School isolation: books"
  on books for all
  using (school_id = get_my_school_id())
  with check (school_id = get_my_school_id());

-- Book loans are scoped through linked books and school users
 drop policy if exists "School isolation: book_loans" on book_loans;
create policy "School isolation: book_loans"
  on book_loans for all
  using (
    book_id in (
      select id from books where school_id = get_my_school_id()
    )
    and borrower_id in (
      select id from profiles where school_id = get_my_school_id()
    )
    and (
      issued_by is null
      or issued_by in (
        select id from profiles where school_id = get_my_school_id()
      )
    )
  )
  with check (
    book_id in (
      select id from books where school_id = get_my_school_id()
    )
    and borrower_id in (
      select id from profiles where school_id = get_my_school_id()
    )
    and (
      issued_by is null
      or issued_by in (
        select id from profiles where school_id = get_my_school_id()
      )
    )
  );

-- Library resources are school-scoped directly
 drop policy if exists "School isolation: library_resources" on library_resources;
create policy "School isolation: library_resources"
  on library_resources for all
  using (
    school_id = get_my_school_id()
    and (
      uploaded_by is null
      or uploaded_by in (
        select id from profiles where school_id = get_my_school_id()
      )
    )
  )
  with check (
    school_id = get_my_school_id()
    and (
      uploaded_by is null
      or uploaded_by in (
        select id from profiles where school_id = get_my_school_id()
      )
    )
  );
