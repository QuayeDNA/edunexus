import { useEffect, useMemo, useState } from 'react';
import {
  Book,
  BookCheck,
  BookOpen,
  Download,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import {
  useCreateBook,
  useCreateLibraryResource,
  useCreateLoan,
  useDeleteBook,
  useDeleteLibraryResource,
  useLibraryBooks,
  useLibraryBorrowers,
  useLibraryLoans,
  useLibraryResources,
  useLibrarySummary,
  useRenewLoan,
  useReturnLoan,
} from '../../../hooks/useLibrary.js';
import { useSubjects } from '../../../hooks/useSubjects.js';
import { useClasses } from '../../../hooks/useClasses.js';
import { storageApi } from '../../../services/api/storage.js';
import {
  formatDate,
  formatGHS,
  formatRelativeTime,
} from '../../../utils/formatters.js';

const LIBRARY_SETTINGS_KEY = 'edunexus:library-settings:v1';

const DEFAULT_SETTINGS = {
  finePerDay: 2,
  maxBorrowedItems: 3,
  defaultLoanDays: 14,
};

const RESOURCE_TYPES = ['PDF', 'Document', 'Past Paper', 'Textbook', 'Notes', 'Other'];

const BOOK_CATEGORIES = [
  'General',
  'Mathematics',
  'Science',
  'English',
  'Social Studies',
  'ICT',
  'Reference',
  'Fiction',
  'Non-fiction',
];

const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

const addDaysIso = (dateStr, days) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
};

const readSettingsStore = () => {
  try {
    const raw = localStorage.getItem(LIBRARY_SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const writeSettingsStore = (nextStore) => {
  try {
    localStorage.setItem(LIBRARY_SETTINGS_KEY, JSON.stringify(nextStore));
  } catch {
    // Ignore storage write errors.
  }
};

const settingsScopeKey = (schoolId) => schoolId ?? 'unknown';

const EMPTY_BOOK_FORM = {
  title: '',
  author: '',
  isbn: '',
  publisher: '',
  publication_year: '',
  category: 'General',
  subject_id: '',
  total_copies: '1',
  location: '',
  cover_url: '',
  description: '',
};

const EMPTY_LOAN_FORM = {
  book_id: '',
  borrower_id: '',
  borrowed_date: toIsoDate(),
  due_date: addDaysIso(toIsoDate(), DEFAULT_SETTINGS.defaultLoanDays),
};

const EMPTY_RESOURCE_FORM = {
  title: '',
  resource_type: 'PDF',
  subject_id: '',
  grade_level_id: '',
  description: '',
  file_url: '',
};

const csvEscape = (value) => {
  const raw = String(value ?? '');
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const downloadTextFile = (content, filename, mime = 'text/plain;charset=utf-8;') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function ELibraryPage() {
  const { schoolId, user } = useAuthContext();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [bookForm, setBookForm] = useState(EMPTY_BOOK_FORM);
  const [loanForm, setLoanForm] = useState(EMPTY_LOAN_FORM);
  const [resourceForm, setResourceForm] = useState(EMPTY_RESOURCE_FORM);

  const [booksSearch, setBooksSearch] = useState('');
  const [bookCategoryFilter, setBookCategoryFilter] = useState('All');
  const [bookSubjectFilter, setBookSubjectFilter] = useState('All');

  const [loanSearch, setLoanSearch] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('All');

  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceSubjectFilter, setResourceSubjectFilter] = useState('All');
  const [resourceGradeFilter, setResourceGradeFilter] = useState('All');

  const [resourceUploading, setResourceUploading] = useState(false);
  const [loanActionId, setLoanActionId] = useState('');

  const [deleteBookTarget, setDeleteBookTarget] = useState(null);
  const [deleteResourceTarget, setDeleteResourceTarget] = useState(null);

  const { data: booksResult, isLoading: booksLoading } = useLibraryBooks({
    schoolId,
    search: booksSearch,
    category: bookCategoryFilter !== 'All' ? bookCategoryFilter : undefined,
    subjectId: bookSubjectFilter !== 'All' ? bookSubjectFilter : undefined,
  });

  const { data: borrowersResult } = useLibraryBorrowers(schoolId, 'All');
  const { data: loansResult, isLoading: loansLoading } = useLibraryLoans({
    schoolId,
    status: loanStatusFilter,
    search: loanSearch,
    finePerDay: settings.finePerDay,
  });
  const { data: summary, isLoading: summaryLoading } = useLibrarySummary(
    schoolId,
    settings.finePerDay
  );

  const { data: resourcesResult, isLoading: resourcesLoading } = useLibraryResources({
    schoolId,
    subjectId: resourceSubjectFilter !== 'All' ? resourceSubjectFilter : undefined,
    gradeLevelId: resourceGradeFilter !== 'All' ? resourceGradeFilter : undefined,
    search: resourceSearch,
  });

  const { data: subjectsResult } = useSubjects({ schoolId });
  const { data: classesResult } = useClasses(schoolId);

  const createBook = useCreateBook();
  const deleteBook = useDeleteBook();
  const createLoan = useCreateLoan();
  const renewLoan = useRenewLoan();
  const returnLoan = useReturnLoan();
  const createResource = useCreateLibraryResource();
  const deleteResource = useDeleteLibraryResource();

  const books = booksResult?.data ?? [];
  const loans = loansResult?.data ?? [];
  const borrowers = borrowersResult?.data ?? [];
  const resources = resourcesResult?.data ?? [];
  const subjects = subjectsResult?.data ?? [];
  const classes = classesResult?.data ?? [];

  useEffect(() => {
    const store = readSettingsStore();
    const scoped = store[settingsScopeKey(schoolId)] ?? DEFAULT_SETTINGS;
    setSettings({
      finePerDay: Number(scoped.finePerDay ?? DEFAULT_SETTINGS.finePerDay),
      maxBorrowedItems: Number(scoped.maxBorrowedItems ?? DEFAULT_SETTINGS.maxBorrowedItems),
      defaultLoanDays: Number(scoped.defaultLoanDays ?? DEFAULT_SETTINGS.defaultLoanDays),
    });
  }, [schoolId]);

  useEffect(() => {
    setLoanForm((prev) => ({
      ...prev,
      due_date: addDaysIso(prev.borrowed_date, settings.defaultLoanDays),
    }));
  }, [settings.defaultLoanDays]);

  const gradeLevels = useMemo(() => {
    const map = new Map();
    (classes ?? []).forEach((row) => {
      const grade = row.grade_levels;
      if (!grade?.id) return;
      if (!map.has(grade.id)) {
        map.set(grade.id, grade);
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0)
    );
  }, [classes]);

  const availableBookOptions = useMemo(
    () => books.filter((row) => Number(row.available_copies ?? 0) > 0),
    [books]
  );

  const activeLoanCountsByBorrower = useMemo(() => {
    const map = {};
    loans.forEach((row) => {
      if (row.effective_status === 'Borrowed' || row.effective_status === 'Overdue') {
        map[row.borrower_id] = (map[row.borrower_id] ?? 0) + 1;
      }
    });
    return map;
  }, [loans]);

  const eligibleBorrowers = useMemo(
    () =>
      borrowers.filter(
        (row) => Number(activeLoanCountsByBorrower[row.id] ?? 0) < Number(settings.maxBorrowedItems)
      ),
    [borrowers, activeLoanCountsByBorrower, settings.maxBorrowedItems]
  );

  const overdueLoanRows = useMemo(
    () => loans.filter((row) => row.effective_status === 'Overdue'),
    [loans]
  );

  const saveSettings = () => {
    const finePerDay = Math.max(Number(settings.finePerDay ?? 0), 0);
    const maxBorrowedItems = Math.max(Number(settings.maxBorrowedItems ?? 1), 1);
    const defaultLoanDays = Math.max(Number(settings.defaultLoanDays ?? 1), 1);

    const normalized = {
      finePerDay,
      maxBorrowedItems,
      defaultLoanDays,
    };

    const store = readSettingsStore();
    store[settingsScopeKey(schoolId)] = normalized;
    writeSettingsStore(store);
    setSettings(normalized);
    toast.success('Library settings saved');
  };

  const handleCreateBook = async () => {
    if (!bookForm.title.trim()) {
      toast.error('Book title is required');
      return;
    }

    const totalCopies = Math.max(Number(bookForm.total_copies || 1), 1);

    await createBook.mutateAsync({
      school_id: schoolId,
      title: bookForm.title.trim(),
      author: bookForm.author.trim() || null,
      isbn: bookForm.isbn.trim() || null,
      publisher: bookForm.publisher.trim() || null,
      publication_year: bookForm.publication_year ? Number(bookForm.publication_year) : null,
      category: bookForm.category || 'General',
      subject_id: bookForm.subject_id || null,
      total_copies: totalCopies,
      available_copies: totalCopies,
      location: bookForm.location.trim() || null,
      cover_url: bookForm.cover_url.trim() || null,
      description: bookForm.description.trim() || null,
    });

    setBookForm((prev) => ({
      ...EMPTY_BOOK_FORM,
      category: prev.category,
    }));
  };

  const handleCreateLoan = async () => {
    if (!loanForm.book_id || !loanForm.borrower_id || !loanForm.due_date) {
      toast.error('Select a book, borrower, and due date');
      return;
    }

    await createLoan.mutateAsync({
      schoolId,
      bookId: loanForm.book_id,
      borrowerId: loanForm.borrower_id,
      borrowedDate: loanForm.borrowed_date,
      dueDate: loanForm.due_date,
      issuedBy: user?.id,
      maxBorrowedItems: settings.maxBorrowedItems,
    });

    setLoanForm({
      ...EMPTY_LOAN_FORM,
      borrowed_date: toIsoDate(),
      due_date: addDaysIso(toIsoDate(), settings.defaultLoanDays),
    });
  };

  const handleRenewLoan = async (row) => {
    setLoanActionId(row.id);
    try {
      await renewLoan.mutateAsync({
        schoolId,
        loanId: row.id,
        newDueDate: addDaysIso(row.due_date, 7),
      });
    } finally {
      setLoanActionId('');
    }
  };

  const handleReturnLoan = async (row) => {
    setLoanActionId(row.id);
    try {
      await returnLoan.mutateAsync({
        schoolId,
        loanId: row.id,
        returnDate: toIsoDate(),
        finePerDay: settings.finePerDay,
      });
    } finally {
      setLoanActionId('');
    }
  };

  const handleUploadResourceFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setResourceUploading(true);
      const { publicUrl } = await storageApi.uploadPublicFile({
        file,
        bucket: 'school-assets',
        folder: `schools/${schoolId || 'unknown'}/library/resources`,
        allowedMimeTypes: ['application/pdf'],
      });

      setResourceForm((prev) => ({ ...prev, file_url: publicUrl }));
      toast.success('Resource file uploaded');
    } catch (err) {
      toast.error(err.message ?? 'Failed to upload resource file');
    } finally {
      setResourceUploading(false);
      event.target.value = '';
    }
  };

  const handleCreateResource = async () => {
    if (!resourceForm.title.trim() || !resourceForm.file_url) {
      toast.error('Resource title and uploaded file are required');
      return;
    }

    await createResource.mutateAsync({
      school_id: schoolId,
      title: resourceForm.title.trim(),
      resource_type: resourceForm.resource_type,
      subject_id: resourceForm.subject_id || null,
      grade_level_id: resourceForm.grade_level_id || null,
      file_url: resourceForm.file_url,
      description: resourceForm.description.trim() || null,
      uploaded_by: user?.id ?? null,
    });

    setResourceForm((prev) => ({
      ...EMPTY_RESOURCE_FORM,
      resource_type: prev.resource_type,
    }));
  };

  const handleDeleteBook = async () => {
    if (!deleteBookTarget) return;
    await deleteBook.mutateAsync({ id: deleteBookTarget.id, schoolId });
    setDeleteBookTarget(null);
  };

  const handleDeleteResource = async () => {
    if (!deleteResourceTarget) return;
    await deleteResource.mutateAsync({ id: deleteResourceTarget.id, schoolId });
    setDeleteResourceTarget(null);
  };

  const handleExportOverdueCsv = () => {
    if (overdueLoanRows.length === 0) {
      toast.error('No overdue loans to export');
      return;
    }

    const headers = [
      'Book Title',
      'ISBN',
      'Borrower',
      'Role',
      'Phone',
      'Borrowed Date',
      'Due Date',
      'Accrued Fine',
    ];

    const lines = [headers.join(',')];

    overdueLoanRows.forEach((row) => {
      const borrowerName = `${row.borrower?.first_name ?? ''} ${row.borrower?.last_name ?? ''}`.trim();

      lines.push(
        [
          row.books?.title ?? '',
          row.books?.isbn ?? '',
          borrowerName,
          row.borrower?.role ?? '',
          row.borrower?.phone ?? '',
          row.borrowed_date ?? '',
          row.due_date ?? '',
          row.accrued_fine ?? 0,
        ]
          .map(csvEscape)
          .join(',')
      );
    });

    downloadTextFile(lines.join('\n'), `library-overdue-reminders-${toIsoDate()}.csv`, 'text/csv;charset=utf-8;');
    toast.success('Overdue reminder CSV exported');
  };

  const bookColumns = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Book',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-text-primary text-sm">{row.original.title}</p>
            <p className="text-xs text-text-muted">{row.original.author || 'Unknown author'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'isbn',
        header: 'ISBN',
        cell: ({ getValue }) => getValue() || '—',
      },
      {
        accessorKey: 'category',
        header: 'Category',
      },
      {
        accessorKey: 'subjects',
        header: 'Subject',
        cell: ({ row }) => row.original.subjects?.name ?? '—',
      },
      {
        accessorKey: 'available_copies',
        header: 'Available',
        cell: ({ row }) => {
          const available = Number(row.original.available_copies ?? 0);
          const total = Number(row.original.total_copies ?? 0);
          return (
            <span className={available <= 0 ? 'font-semibold text-status-danger' : 'font-semibold text-status-success'}>
              {available}/{total}
            </span>
          );
        },
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ getValue }) => getValue() || '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => setDeleteBookTarget(row.original)}
            className="btn-ghost h-8 px-2 text-status-danger"
            aria-label={`Delete book ${row.original.title}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ),
      },
    ],
    []
  );

  const loanColumns = useMemo(
    () => [
      {
        accessorKey: 'borrowed_date',
        header: 'Borrowed',
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        accessorKey: 'books',
        header: 'Book',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-text-primary text-sm">{row.original.books?.title ?? '—'}</p>
            <p className="text-xs text-text-muted">{row.original.books?.isbn ?? '—'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'borrower',
        header: 'Borrower',
        cell: ({ row }) => {
          const borrowerName = `${row.original.borrower?.first_name ?? ''} ${row.original.borrower?.last_name ?? ''}`.trim();
          return (
            <div>
              <p className="font-semibold text-text-primary text-sm">{borrowerName || '—'}</p>
              <p className="text-xs text-text-muted">{row.original.borrower?.phone ?? 'No phone'}</p>
            </div>
          );
        },
      },
      {
        accessorKey: 'due_date',
        header: 'Due',
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        accessorKey: 'effective_status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} dot size="sm" />,
      },
      {
        accessorKey: 'accrued_fine',
        header: 'Fine',
        cell: ({ getValue }) => formatGHS(getValue()),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const canRenew = row.original.effective_status === 'Borrowed' || row.original.effective_status === 'Overdue';
          const canReturn = canRenew;
          const busy = loanActionId === row.original.id;

          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleRenewLoan(row.original)}
                disabled={!canRenew || busy}
                className="btn-secondary h-8 px-2 text-xs"
                aria-label={`Renew loan for ${row.original.books?.title ?? 'book'}`}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Renew +7d'}
              </button>
              <button
                onClick={() => handleReturnLoan(row.original)}
                disabled={!canReturn || busy}
                className="btn-primary h-8 px-2 text-xs"
                aria-label={`Return book ${row.original.books?.title ?? 'book'}`}
              >
                Return
              </button>
            </div>
          );
        },
      },
    ],
    [loanActionId]
  );

  const resourceColumns = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Resource',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-text-primary text-sm">{row.original.title}</p>
            <p className="text-xs text-text-muted">{row.original.description ?? '—'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'resource_type',
        header: 'Type',
      },
      {
        accessorKey: 'subjects',
        header: 'Subject',
        cell: ({ row }) => row.original.subjects?.name ?? '—',
      },
      {
        accessorKey: 'grade_levels',
        header: 'Grade',
        cell: ({ row }) => row.original.grade_levels?.name ?? '—',
      },
      {
        accessorKey: 'uploader_profile',
        header: 'Uploaded By',
        cell: ({ row }) => {
          const uploader = `${row.original.uploader_profile?.first_name ?? ''} ${row.original.uploader_profile?.last_name ?? ''}`.trim();
          return uploader || '—';
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Uploaded',
        cell: ({ getValue }) => formatRelativeTime(getValue()),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <a
              href={row.original.file_url}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary h-8 px-2 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Open
            </a>
            <button
              onClick={() => setDeleteResourceTarget(row.original)}
              className="btn-ghost h-8 px-2 text-status-danger"
              aria-label={`Delete resource ${row.original.title}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const stats = {
    totalTitles: Number(summary?.totalTitles ?? 0),
    availableCopies: Number(summary?.availableCopies ?? 0),
    borrowedCount: Number(summary?.borrowedCount ?? 0),
    overdueCount: Number(summary?.overdueCount ?? 0),
    outstandingFine: Number(summary?.outstandingFine ?? 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-Library"
        subtitle="Manage book catalog, borrowing, fines, and digital learning resources"
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          title="Titles"
          value={summaryLoading ? null : stats.totalTitles}
          icon={BookOpen}
          color="bg-brand-50 text-brand-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Available Copies"
          value={summaryLoading ? null : stats.availableCopies}
          icon={Book}
          color="bg-status-successBg text-status-success"
          loading={summaryLoading}
        />
        <StatCard
          title="Active Loans"
          value={summaryLoading ? null : stats.borrowedCount}
          icon={BookCheck}
          color="bg-blue-50 text-blue-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Overdue"
          value={summaryLoading ? null : stats.overdueCount}
          icon={Users}
          color="bg-status-dangerBg text-status-danger"
          loading={summaryLoading}
        />
        <StatCard
          title="Outstanding Fines"
          value={summaryLoading ? null : formatGHS(stats.outstandingFine, true)}
          icon={Users}
          color="bg-amber-50 text-amber-700"
          loading={summaryLoading}
        />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Library Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Fine Per Day (GH₵)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={settings.finePerDay}
              onChange={(e) => setSettings((prev) => ({ ...prev, finePerDay: e.target.value }))}
              className="input-base h-9 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Max Borrowed Items</label>
            <input
              type="number"
              min={1}
              step="1"
              value={settings.maxBorrowedItems}
              onChange={(e) => setSettings((prev) => ({ ...prev, maxBorrowedItems: e.target.value }))}
              className="input-base h-9 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Default Loan Duration (days)</label>
            <input
              type="number"
              min={1}
              step="1"
              value={settings.defaultLoanDays}
              onChange={(e) => setSettings((prev) => ({ ...prev, defaultLoanDays: e.target.value }))}
              className="input-base h-9 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button onClick={saveSettings} className="btn-primary h-9 text-sm ml-auto">
              Save Settings
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Add Book to Catalog</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Title</label>
            <input
              value={bookForm.title}
              onChange={(e) => setBookForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Introduction to Basic Science"
              className="input-base h-9 text-sm"
              disabled={createBook.isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Author</label>
            <input
              value={bookForm.author}
              onChange={(e) => setBookForm((prev) => ({ ...prev, author: e.target.value }))}
              placeholder="Author"
              className="input-base h-9 text-sm"
              disabled={createBook.isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">ISBN</label>
            <input
              value={bookForm.isbn}
              onChange={(e) => setBookForm((prev) => ({ ...prev, isbn: e.target.value }))}
              placeholder="ISBN"
              className="input-base h-9 text-sm"
              disabled={createBook.isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
            <select
              value={bookForm.category}
              onChange={(e) => setBookForm((prev) => ({ ...prev, category: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createBook.isPending}
            >
              {BOOK_CATEGORIES.map((row) => (
                <option key={row} value={row}>
                  {row}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Total Copies</label>
            <input
              type="number"
              min={1}
              step="1"
              value={bookForm.total_copies}
              onChange={(e) => setBookForm((prev) => ({ ...prev, total_copies: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createBook.isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Subject</label>
            <select
              value={bookForm.subject_id}
              onChange={(e) => setBookForm((prev) => ({ ...prev, subject_id: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createBook.isPending}
            >
              <option value="">Unmapped</option>
              {subjects.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Publisher</label>
            <input
              value={bookForm.publisher}
              onChange={(e) => setBookForm((prev) => ({ ...prev, publisher: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createBook.isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Publication Year</label>
            <input
              type="number"
              min={1900}
              max={new Date().getFullYear() + 1}
              value={bookForm.publication_year}
              onChange={(e) =>
                setBookForm((prev) => ({ ...prev, publication_year: e.target.value }))
              }
              className="input-base h-9 text-sm"
              disabled={createBook.isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Shelf Location</label>
            <input
              value={bookForm.location}
              onChange={(e) => setBookForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Shelf A-3"
              className="input-base h-9 text-sm"
              disabled={createBook.isPending}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Cover URL</label>
            <input
              value={bookForm.cover_url}
              onChange={(e) => setBookForm((prev) => ({ ...prev, cover_url: e.target.value }))}
              placeholder="https://..."
              className="input-base h-9 text-sm"
              disabled={createBook.isPending}
            />
          </div>
          <div className="md:col-span-6">
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <input
              value={bookForm.description}
              onChange={(e) => setBookForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Short summary"
              className="input-base h-9 text-sm"
              disabled={createBook.isPending}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleCreateBook}
            disabled={createBook.isPending}
            className="btn-primary h-9 text-sm"
          >
            {createBook.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Book
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-border shadow-card overflow-hidden">
          <DataTable
            columns={bookColumns}
            data={books}
            isLoading={booksLoading}
            exportFileName="library-catalog"
            pageSize={50}
            searchable={false}
            emptyTitle="No books found"
            emptyMessage="Add your first book to start using the library module."
            toolbar={
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  <input
                    type="search"
                    value={booksSearch}
                    onChange={(e) => setBooksSearch(e.target.value)}
                    placeholder="Search title, author, ISBN..."
                    className="input-base h-9 text-xs pl-8 min-w-56"
                  />
                </div>

                <select
                  value={bookCategoryFilter}
                  onChange={(e) => setBookCategoryFilter(e.target.value)}
                  className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                  aria-label="Filter books by category"
                >
                  <option value="All">All Categories</option>
                  {BOOK_CATEGORIES.map((row) => (
                    <option key={row} value={row}>
                      {row}
                    </option>
                  ))}
                </select>

                <select
                  value={bookSubjectFilter}
                  onChange={(e) => setBookSubjectFilter(e.target.value)}
                  className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                  aria-label="Filter books by subject"
                >
                  <option value="All">All Subjects</option>
                  {subjects.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Popular Books</h2>
            <p className="text-xs text-text-muted mt-0.5">Top borrowed titles</p>
          </div>

          {(summary?.popularBooks ?? []).length === 0 ? (
            <p className="text-xs text-text-muted">No borrowing history yet.</p>
          ) : (
            <div className="space-y-2">
              {(summary?.popularBooks ?? []).map((row, index) => (
                <div key={row.bookId} className="border border-border rounded-lg p-2.5">
                  <p className="text-xs text-text-muted">#{index + 1}</p>
                  <p className="text-sm font-semibold text-text-primary mt-0.5">{row.title}</p>
                  <p className="text-xs text-text-secondary">{row.author} · {row.loanCount} loans</p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <h3 className="text-sm font-semibold text-text-primary">Overdue Reminder Queue</h3>
            <p className="text-xs text-text-muted mt-0.5 mb-2">
              {overdueLoanRows.length} overdue loan{overdueLoanRows.length !== 1 ? 's' : ''} ready for follow-up
            </p>
            <button onClick={handleExportOverdueCsv} className="btn-secondary h-9 text-xs w-full">
              <Download className="w-3.5 h-3.5" />
              Export Reminder CSV
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Issue Loan</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Book</label>
            <select
              value={loanForm.book_id}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, book_id: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createLoan.isPending}
            >
              <option value="">Select available book...</option>
              {availableBookOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title} · {row.author || 'Unknown'} · {row.available_copies}/{row.total_copies}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Borrower</label>
            <select
              value={loanForm.borrower_id}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, borrower_id: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createLoan.isPending}
            >
              <option value="">Select borrower...</option>
              {eligibleBorrowers.map((row) => {
                const displayName = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || 'Profile';
                const activeLoans = Number(activeLoanCountsByBorrower[row.id] ?? 0);
                return (
                  <option key={row.id} value={row.id}>
                    {displayName} · {row.role} · Active loans {activeLoans}/{settings.maxBorrowedItems}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Borrowed Date</label>
            <input
              type="date"
              value={loanForm.borrowed_date}
              onChange={(e) =>
                setLoanForm((prev) => ({
                  ...prev,
                  borrowed_date: e.target.value,
                  due_date: addDaysIso(e.target.value, Number(settings.defaultLoanDays)),
                }))
              }
              className="input-base h-9 text-sm"
              disabled={createLoan.isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Due Date</label>
            <input
              type="date"
              value={loanForm.due_date}
              onChange={(e) => setLoanForm((prev) => ({ ...prev, due_date: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createLoan.isPending}
            />
          </div>
          <div className="md:col-span-4 flex items-end">
            <p className="text-xs text-text-muted">
              Fine accrual rate is {formatGHS(settings.finePerDay)} per overdue day.
            </p>
          </div>
          <div className="flex items-end justify-end">
            <button onClick={handleCreateLoan} disabled={createLoan.isPending} className="btn-primary h-9 text-sm">
              {createLoan.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Issuing...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Issue Loan
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={loanColumns}
          data={loans}
          isLoading={loansLoading}
          exportFileName="library-loans"
          pageSize={50}
          searchable={false}
          emptyTitle="No loan records"
          emptyMessage="Issue a book loan to start tracking circulation."
          toolbar={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input
                  type="search"
                  value={loanSearch}
                  onChange={(e) => setLoanSearch(e.target.value)}
                  placeholder="Search borrower, book, phone..."
                  className="input-base h-9 text-xs pl-8 min-w-56"
                />
              </div>

              <select
                value={loanStatusFilter}
                onChange={(e) => setLoanStatusFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Filter loans by status"
              >
                <option value="All">All Statuses</option>
                <option value="Borrowed">Borrowed</option>
                <option value="Overdue">Overdue</option>
                <option value="Returned">Returned</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          }
        />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Digital Resources</h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Title</label>
            <input
              value={resourceForm.title}
              onChange={(e) => setResourceForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="JHS 2 Maths Past Questions"
              className="input-base h-9 text-sm"
              disabled={createResource.isPending}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
            <select
              value={resourceForm.resource_type}
              onChange={(e) => setResourceForm((prev) => ({ ...prev, resource_type: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createResource.isPending}
            >
              {RESOURCE_TYPES.map((row) => (
                <option key={row} value={row}>
                  {row}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Subject</label>
            <select
              value={resourceForm.subject_id}
              onChange={(e) => setResourceForm((prev) => ({ ...prev, subject_id: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createResource.isPending}
            >
              <option value="">Any subject</option>
              {subjects.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Grade Level</label>
            <select
              value={resourceForm.grade_level_id}
              onChange={(e) =>
                setResourceForm((prev) => ({ ...prev, grade_level_id: e.target.value }))
              }
              className="input-base h-9 text-sm"
              disabled={createResource.isPending}
            >
              <option value="">Any grade</option>
              {gradeLevels.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="btn-secondary h-9 text-sm cursor-pointer">
              {resourceUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {resourceUploading ? 'Uploading...' : 'Upload PDF'}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleUploadResourceFile}
                disabled={resourceUploading || createResource.isPending}
              />
            </label>
          </div>
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <input
              value={resourceForm.description}
              onChange={(e) =>
                setResourceForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Optional description"
              className="input-base h-9 text-sm"
              disabled={createResource.isPending}
            />
          </div>
          <div className="flex items-end justify-end">
            <button
              onClick={handleCreateResource}
              disabled={createResource.isPending || resourceUploading}
              className="btn-primary h-9 text-sm"
            >
              {createResource.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Resource
                </>
              )}
            </button>
          </div>
        </div>

        {resourceForm.file_url ? (
          <p className="text-xs text-text-muted">
            Uploaded file:{' '}
            <a href={resourceForm.file_url} target="_blank" rel="noreferrer" className="text-brand-700 underline underline-offset-2">
              open preview
            </a>
          </p>
        ) : null}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={resourceColumns}
          data={resources}
          isLoading={resourcesLoading}
          exportFileName="library-resources"
          pageSize={50}
          searchable={false}
          emptyTitle="No digital resources"
          emptyMessage="Upload a PDF resource to begin building the curriculum library."
          toolbar={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input
                  type="search"
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  placeholder="Search title, subject, grade..."
                  className="input-base h-9 text-xs pl-8 min-w-56"
                />
              </div>

              <select
                value={resourceSubjectFilter}
                onChange={(e) => setResourceSubjectFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Filter resources by subject"
              >
                <option value="All">All Subjects</option>
                {subjects.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>

              <select
                value={resourceGradeFilter}
                onChange={(e) => setResourceGradeFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Filter resources by grade"
              >
                <option value="All">All Grades</option>
                {gradeLevels.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      </div>

      <ConfirmDialog
        open={!!deleteBookTarget}
        onClose={() => setDeleteBookTarget(null)}
        onConfirm={handleDeleteBook}
        title="Delete Book"
        message={deleteBookTarget ? `Delete "${deleteBookTarget.title}" from the catalog?` : ''}
        confirmLabel="Delete Book"
        loading={deleteBook.isPending}
      />

      <ConfirmDialog
        open={!!deleteResourceTarget}
        onClose={() => setDeleteResourceTarget(null)}
        onConfirm={handleDeleteResource}
        title="Delete Resource"
        message={deleteResourceTarget ? `Delete resource "${deleteResourceTarget.title}"?` : ''}
        confirmLabel="Delete Resource"
        loading={deleteResource.isPending}
      />
    </div>
  );
}
