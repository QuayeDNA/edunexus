import { supabase } from '../supabaseClient.js';

const EMPTY_LIST = { data: [], error: null, count: 0 };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

const normalizeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const daysBetween = (fromDate, toDate) => {
  const from = normalizeDate(fromDate);
  const to = normalizeDate(toDate);
  if (!from || !to) return 0;

  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((utcTo - utcFrom) / MS_PER_DAY);
};

const calculateAccruedFine = ({ dueDate, endDate, finePerDay }) => {
  const rate = Number(finePerDay ?? 0);
  if (!dueDate || rate <= 0) return 0;

  const daysLate = Math.max(daysBetween(dueDate, endDate), 0);
  return daysLate * rate;
};

const withBookSearchFilter = (rows, search) => {
  const query = search?.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const title = (row.title ?? '').toLowerCase();
    const author = (row.author ?? '').toLowerCase();
    const isbn = (row.isbn ?? '').toLowerCase();
    const category = (row.category ?? '').toLowerCase();
    const subjectName = (row.subjects?.name ?? '').toLowerCase();
    const publisher = (row.publisher ?? '').toLowerCase();

    return (
      title.includes(query) ||
      author.includes(query) ||
      isbn.includes(query) ||
      category.includes(query) ||
      subjectName.includes(query) ||
      publisher.includes(query)
    );
  });
};

const withLoanSearchFilter = (rows, search) => {
  const query = search?.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const bookTitle = (row.books?.title ?? '').toLowerCase();
    const bookIsbn = (row.books?.isbn ?? '').toLowerCase();
    const borrowerName = `${row.borrower?.first_name ?? ''} ${row.borrower?.last_name ?? ''}`
      .trim()
      .toLowerCase();
    const borrowerPhone = (row.borrower?.phone ?? '').toLowerCase();
    const status = (row.effective_status ?? '').toLowerCase();

    return (
      bookTitle.includes(query) ||
      bookIsbn.includes(query) ||
      borrowerName.includes(query) ||
      borrowerPhone.includes(query) ||
      status.includes(query)
    );
  });
};

const withResourceSearchFilter = (rows, search) => {
  const query = search?.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const title = (row.title ?? '').toLowerCase();
    const type = (row.resource_type ?? '').toLowerCase();
    const subjectName = (row.subjects?.name ?? '').toLowerCase();
    const gradeName = (row.grade_levels?.name ?? '').toLowerCase();
    const description = (row.description ?? '').toLowerCase();

    return (
      title.includes(query) ||
      type.includes(query) ||
      subjectName.includes(query) ||
      gradeName.includes(query) ||
      description.includes(query)
    );
  });
};

const getSchoolBookRows = async (schoolId) => {
  if (!schoolId) return { rows: [], error: null };

  const { data, error } = await supabase
    .from('books')
    .select('id, school_id, title, author, isbn, category, total_copies, available_copies')
    .eq('school_id', schoolId);

  if (error) return { rows: [], error };

  return {
    rows: data ?? [],
    error: null,
  };
};

const getProfilesByIds = async (ids = []) => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return { map: {}, error: null };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, school_id, role, first_name, last_name, phone')
    .in('id', uniqueIds);

  if (error) return { map: {}, error };

  const map = {};
  (data ?? []).forEach((row) => {
    map[row.id] = row;
  });

  return { map, error: null };
};

const enrichLoans = ({
  loanRows = [],
  booksMap = {},
  borrowersMap = {},
  issuersMap = {},
  finePerDay,
}) => {
  const today = toIsoDate();

  return loanRows.map((row) => {
    const hasReturned = !!row.returned_date;

    let effectiveStatus = row.status ?? 'Borrowed';
    if (!hasReturned && row.status !== 'Lost') {
      const overdueDays = row.due_date ? daysBetween(row.due_date, today) : 0;
      effectiveStatus = overdueDays > 0 ? 'Overdue' : 'Borrowed';
    }

    const accruedFine = hasReturned
      ? Number(row.fine_amount ?? 0)
      : calculateAccruedFine({
          dueDate: row.due_date,
          endDate: today,
          finePerDay,
        });

    return {
      ...row,
      books: booksMap[row.book_id] ?? null,
      borrower: borrowersMap[row.borrower_id] ?? null,
      issued_by_profile: issuersMap[row.issued_by] ?? null,
      effective_status: effectiveStatus,
      accrued_fine: accruedFine,
    };
  });
};

export const libraryApi = {
  listBooks: async ({ schoolId, search, category, subjectId, onlyAvailable, limit } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    let query = supabase
      .from('books')
      .select(
        'id, school_id, title, author, isbn, publisher, publication_year, category, subject_id, total_copies, available_copies, location, cover_url, description, subjects(id, name, code)',
        { count: 'exact' }
      )
      .eq('school_id', schoolId)
      .order('title', { ascending: true });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    if (onlyAvailable) {
      query = query.gt('available_copies', 0);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) return { data: [], error, count: 0 };

    const filtered = withBookSearchFilter(data ?? [], search);
    return { data: filtered, error: null, count: filtered.length };
  },

  createBook: async (payload) => {
    const nextTotal = Math.max(Number(payload?.total_copies ?? 1), 1);
    const nextAvailable = payload?.available_copies == null
      ? nextTotal
      : Math.max(Number(payload.available_copies), 0);

    return supabase
      .from('books')
      .insert({
        ...payload,
        total_copies: nextTotal,
        available_copies: Math.min(nextAvailable, nextTotal),
      })
      .select(
        'id, school_id, title, author, isbn, publisher, publication_year, category, subject_id, total_copies, available_copies, location, cover_url, description, subjects(id, name, code)'
      )
      .single();
  },

  updateBook: async (id, payload) => {
    const patch = { ...payload };

    if (patch.total_copies != null) {
      patch.total_copies = Math.max(Number(patch.total_copies), 1);
    }

    if (patch.available_copies != null) {
      patch.available_copies = Math.max(Number(patch.available_copies), 0);
    }

    return supabase
      .from('books')
      .update(patch)
      .eq('id', id)
      .select(
        'id, school_id, title, author, isbn, publisher, publication_year, category, subject_id, total_copies, available_copies, location, cover_url, description, subjects(id, name, code)'
      )
      .single();
  },

  deleteBook: async (id) => {
    const { count, error: activeError } = await supabase
      .from('book_loans')
      .select('id', { count: 'exact', head: true })
      .eq('book_id', id)
      .is('returned_date', null)
      .neq('status', 'Lost');

    if (activeError) {
      return { error: activeError };
    }

    if (Number(count ?? 0) > 0) {
      return {
        error: new Error('Cannot delete book with active loans. Return or mark loans as lost first.'),
      };
    }

    return supabase
      .from('books')
      .delete()
      .eq('id', id);
  },

  listBorrowers: async ({ schoolId, role } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    let query = supabase
      .from('profiles')
      .select('id, school_id, role, first_name, last_name, phone', { count: 'exact' })
      .eq('school_id', schoolId)
      .in('role', ['student', 'teacher'])
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true });

    if (role && role !== 'All') {
      query = query.eq('role', role);
    }

    const { data, error, count } = await query;
    if (error) return { data: [], error, count: 0 };

    return {
      data: data ?? [],
      error: null,
      count: count ?? 0,
    };
  },

  listLoans: async ({
    schoolId,
    status,
    search,
    overdueOnly = false,
    finePerDay = 0,
    limit,
  } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    const { rows: schoolBooks, error: booksError } = await getSchoolBookRows(schoolId);
    if (booksError) return { data: [], error: booksError, count: 0 };
    if (schoolBooks.length === 0) return EMPTY_LIST;

    const schoolBookIds = schoolBooks.map((row) => row.id);

    let query = supabase
      .from('book_loans')
      .select('id, book_id, borrower_id, borrowed_date, due_date, returned_date, status, fine_amount, issued_by', { count: 'exact' })
      .in('book_id', schoolBookIds)
      .order('borrowed_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: loanRows, error } = await query;
    if (error) return { data: [], error, count: 0 };

    const borrowerIds = (loanRows ?? []).map((row) => row.borrower_id);
    const issuerIds = (loanRows ?? []).map((row) => row.issued_by);

    const [{ map: borrowerMap, error: borrowerError }, { map: issuerMap, error: issuerError }] = await Promise.all([
      getProfilesByIds(borrowerIds),
      getProfilesByIds(issuerIds),
    ]);

    if (borrowerError) return { data: [], error: borrowerError, count: 0 };
    if (issuerError) return { data: [], error: issuerError, count: 0 };

    const booksMap = {};
    schoolBooks.forEach((row) => {
      booksMap[row.id] = row;
    });

    let enriched = enrichLoans({
      loanRows: loanRows ?? [],
      booksMap,
      borrowersMap: borrowerMap,
      issuersMap: issuerMap,
      finePerDay,
    });

    if (overdueOnly) {
      enriched = enriched.filter((row) => row.effective_status === 'Overdue');
    }

    if (status && status !== 'All') {
      enriched = enriched.filter((row) => row.effective_status === status);
    }

    const filtered = withLoanSearchFilter(enriched, search);
    return { data: filtered, error: null, count: filtered.length };
  },

  createLoan: async ({
    schoolId,
    bookId,
    borrowerId,
    borrowedDate,
    dueDate,
    issuedBy,
    maxBorrowedItems = 3,
  } = {}) => {
    if (!schoolId || !bookId || !borrowerId) {
      return {
        data: null,
        error: new Error('School, book, and borrower are required'),
      };
    }

    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, school_id, total_copies, available_copies')
      .eq('id', bookId)
      .single();

    if (bookError) return { data: null, error: bookError };

    if (book.school_id !== schoolId) {
      return { data: null, error: new Error('Selected book does not belong to this school') };
    }

    if (Number(book.available_copies ?? 0) <= 0) {
      return { data: null, error: new Error('No available copies for this book') };
    }

    const { count: activeCount, error: activeError } = await supabase
      .from('book_loans')
      .select('id', { count: 'exact', head: true })
      .eq('borrower_id', borrowerId)
      .is('returned_date', null)
      .neq('status', 'Lost');

    if (activeError) {
      return { data: null, error: activeError };
    }

    const borrowLimit = Math.max(Number(maxBorrowedItems ?? 3), 1);
    if (Number(activeCount ?? 0) >= borrowLimit) {
      return {
        data: null,
        error: new Error(`Borrowing limit reached (${borrowLimit} active loans)`),
      };
    }

    const { data: loan, error: insertError } = await supabase
      .from('book_loans')
      .insert({
        book_id: bookId,
        borrower_id: borrowerId,
        borrowed_date: borrowedDate || toIsoDate(),
        due_date: dueDate,
        status: 'Borrowed',
        fine_amount: 0,
        issued_by: issuedBy || null,
      })
      .select('id, book_id, borrower_id, borrowed_date, due_date, returned_date, status, fine_amount, issued_by')
      .single();

    if (insertError) {
      return { data: null, error: insertError };
    }

    const nextAvailable = Math.max(Number(book.available_copies ?? 0) - 1, 0);

    const { error: updateBookError } = await supabase
      .from('books')
      .update({ available_copies: nextAvailable })
      .eq('id', bookId);

    if (updateBookError) {
      return { data: null, error: updateBookError };
    }

    return { data: loan, error: null };
  },

  renewLoan: async ({ loanId, newDueDate } = {}) => {
    if (!loanId || !newDueDate) {
      return { data: null, error: new Error('Loan id and due date are required') };
    }

    const { data: loanRow, error: loanError } = await supabase
      .from('book_loans')
      .select('id, returned_date, status')
      .eq('id', loanId)
      .single();

    if (loanError) return { data: null, error: loanError };

    if (loanRow.returned_date || loanRow.status === 'Lost') {
      return { data: null, error: new Error('Cannot renew a closed loan') };
    }

    return supabase
      .from('book_loans')
      .update({
        due_date: newDueDate,
        status: 'Borrowed',
      })
      .eq('id', loanId)
      .select('id, book_id, borrower_id, borrowed_date, due_date, returned_date, status, fine_amount, issued_by')
      .single();
  },

  returnLoan: async ({ loanId, returnDate, finePerDay = 0 } = {}) => {
    if (!loanId) {
      return { data: null, error: new Error('Loan id is required') };
    }

    const effectiveReturnDate = returnDate || toIsoDate();

    const { data: loanRow, error: loanError } = await supabase
      .from('book_loans')
      .select('id, book_id, due_date, returned_date, status')
      .eq('id', loanId)
      .single();

    if (loanError) return { data: null, error: loanError };

    if (loanRow.returned_date) {
      return { data: null, error: new Error('Loan is already returned') };
    }

    if (loanRow.status === 'Lost') {
      return { data: null, error: new Error('Loan is marked lost and cannot be returned') };
    }

    const fine = calculateAccruedFine({
      dueDate: loanRow.due_date,
      endDate: effectiveReturnDate,
      finePerDay,
    });

    const { data: updatedLoan, error: updateLoanError } = await supabase
      .from('book_loans')
      .update({
        returned_date: effectiveReturnDate,
        status: 'Returned',
        fine_amount: fine,
      })
      .eq('id', loanId)
      .select('id, book_id, borrower_id, borrowed_date, due_date, returned_date, status, fine_amount, issued_by')
      .single();

    if (updateLoanError) {
      return { data: null, error: updateLoanError };
    }

    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, total_copies, available_copies')
      .eq('id', loanRow.book_id)
      .single();

    if (bookError) {
      return { data: null, error: bookError };
    }

    const nextAvailable = Math.min(
      Number(book.total_copies ?? 0),
      Number(book.available_copies ?? 0) + 1
    );

    const { error: updateBookError } = await supabase
      .from('books')
      .update({ available_copies: nextAvailable })
      .eq('id', book.id);

    if (updateBookError) {
      return { data: null, error: updateBookError };
    }

    return { data: updatedLoan, error: null };
  },

  getLibrarySummary: async ({ schoolId, finePerDay = 0 } = {}) => {
    if (!schoolId) {
      return {
        totalTitles: 0,
        totalCopies: 0,
        availableCopies: 0,
        borrowedCount: 0,
        overdueCount: 0,
        activeBorrowers: 0,
        outstandingFine: 0,
        popularBooks: [],
      };
    }

    const { rows: books, error: booksError } = await getSchoolBookRows(schoolId);
    if (booksError) throw booksError;

    const totalTitles = books.length;
    const totalCopies = books.reduce((sum, row) => sum + Number(row.total_copies ?? 0), 0);
    const availableCopies = books.reduce((sum, row) => sum + Number(row.available_copies ?? 0), 0);

    if (books.length === 0) {
      return {
        totalTitles,
        totalCopies,
        availableCopies,
        borrowedCount: 0,
        overdueCount: 0,
        activeBorrowers: 0,
        outstandingFine: 0,
        popularBooks: [],
      };
    }

    const bookIds = books.map((row) => row.id);

    const { data: loans, error: loansError } = await supabase
      .from('book_loans')
      .select('id, book_id, borrower_id, due_date, returned_date, status, fine_amount')
      .in('book_id', bookIds);

    if (loansError) throw loansError;

    const today = toIsoDate();
    const loanRows = loans ?? [];

    let borrowedCount = 0;
    let overdueCount = 0;
    let outstandingFine = 0;

    const activeBorrowerSet = new Set();
    const popularCounter = {};

    loanRows.forEach((row) => {
      popularCounter[row.book_id] = (popularCounter[row.book_id] ?? 0) + 1;

      const isClosed = !!row.returned_date || row.status === 'Returned' || row.status === 'Lost';
      if (!isClosed) {
        borrowedCount += 1;
        if (row.borrower_id) {
          activeBorrowerSet.add(row.borrower_id);
        }

        const isOverdue = row.due_date ? daysBetween(row.due_date, today) > 0 : false;
        if (isOverdue) {
          overdueCount += 1;
          outstandingFine += calculateAccruedFine({
            dueDate: row.due_date,
            endDate: today,
            finePerDay,
          });
        }
      }
    });

    const bookMap = {};
    books.forEach((row) => {
      bookMap[row.id] = row;
    });

    const popularBooks = Object.entries(popularCounter)
      .map(([bookId, loanCount]) => {
        const book = bookMap[bookId] ?? {};
        return {
          bookId,
          loanCount,
          title: book.title ?? 'Unknown title',
          author: book.author ?? '—',
          category: book.category ?? '—',
        };
      })
      .sort((a, b) => b.loanCount - a.loanCount)
      .slice(0, 5);

    return {
      totalTitles,
      totalCopies,
      availableCopies,
      borrowedCount,
      overdueCount,
      activeBorrowers: activeBorrowerSet.size,
      outstandingFine,
      popularBooks,
    };
  },

  listResources: async ({ schoolId, subjectId, gradeLevelId, search, limit } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    let query = supabase
      .from('library_resources')
      .select('id, school_id, title, resource_type, subject_id, grade_level_id, file_url, description, uploaded_by, created_at', {
        count: 'exact',
      })
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    if (gradeLevelId) {
      query = query.eq('grade_level_id', gradeLevelId);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: rows, error } = await query;
    if (error) return { data: [], error, count: 0 };

    const resources = rows ?? [];

    const subjectIds = Array.from(new Set(resources.map((row) => row.subject_id).filter(Boolean)));
    const gradeLevelIds = Array.from(new Set(resources.map((row) => row.grade_level_id).filter(Boolean)));
    const uploaderIds = Array.from(new Set(resources.map((row) => row.uploaded_by).filter(Boolean)));

    const [subjectsResult, gradeLevelsResult, uploadersResult] = await Promise.all([
      subjectIds.length > 0
        ? supabase.from('subjects').select('id, name, code').in('id', subjectIds)
        : Promise.resolve({ data: [], error: null }),
      gradeLevelIds.length > 0
        ? supabase.from('grade_levels').select('id, name, order_index').in('id', gradeLevelIds)
        : Promise.resolve({ data: [], error: null }),
      uploaderIds.length > 0
        ? supabase.from('profiles').select('id, first_name, last_name').in('id', uploaderIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (subjectsResult.error) return { data: [], error: subjectsResult.error, count: 0 };
    if (gradeLevelsResult.error) return { data: [], error: gradeLevelsResult.error, count: 0 };
    if (uploadersResult.error) return { data: [], error: uploadersResult.error, count: 0 };

    const subjectMap = {};
    (subjectsResult.data ?? []).forEach((row) => {
      subjectMap[row.id] = row;
    });

    const gradeMap = {};
    (gradeLevelsResult.data ?? []).forEach((row) => {
      gradeMap[row.id] = row;
    });

    const uploaderMap = {};
    (uploadersResult.data ?? []).forEach((row) => {
      uploaderMap[row.id] = row;
    });

    const enriched = resources.map((row) => ({
      ...row,
      subjects: row.subject_id ? subjectMap[row.subject_id] ?? null : null,
      grade_levels: row.grade_level_id ? gradeMap[row.grade_level_id] ?? null : null,
      uploader_profile: row.uploaded_by ? uploaderMap[row.uploaded_by] ?? null : null,
    }));

    const filtered = withResourceSearchFilter(enriched, search);
    return { data: filtered, error: null, count: filtered.length };
  },

  createResource: (payload) =>
    supabase
      .from('library_resources')
      .insert(payload)
      .select('id, school_id, title, resource_type, subject_id, grade_level_id, file_url, description, uploaded_by, created_at')
      .single(),

  deleteResource: (id) =>
    supabase
      .from('library_resources')
      .delete()
      .eq('id', id),
};
