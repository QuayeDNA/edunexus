import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { libraryApi } from '../services/api/library.js';

export const LIBRARY_BOOKS_KEY = ({ schoolId, search, category, subjectId, onlyAvailable, limit } = {}) => [
  'library-books',
  schoolId,
  search ?? '',
  category ?? 'all',
  subjectId ?? 'all',
  onlyAvailable ? 'available' : 'all',
  limit ?? 'all',
];

export const LIBRARY_LOANS_KEY = ({ schoolId, status, search, overdueOnly, finePerDay, limit } = {}) => [
  'library-loans',
  schoolId,
  status ?? 'all',
  search ?? '',
  overdueOnly ? 'overdue-only' : 'all',
  Number(finePerDay ?? 0),
  limit ?? 'all',
];

export const LIBRARY_SUMMARY_KEY = (schoolId, finePerDay) => ['library-summary', schoolId, Number(finePerDay ?? 0)];

export const LIBRARY_BORROWERS_KEY = (schoolId, role) => ['library-borrowers', schoolId, role ?? 'all'];

export const LIBRARY_RESOURCES_KEY = ({ schoolId, subjectId, gradeLevelId, search, limit } = {}) => [
  'library-resources',
  schoolId,
  subjectId ?? 'all',
  gradeLevelId ?? 'all',
  search ?? '',
  limit ?? 'all',
];

export const useLibraryBooks = ({ schoolId, search, category, subjectId, onlyAvailable, limit } = {}) =>
  useQuery({
    queryKey: LIBRARY_BOOKS_KEY({ schoolId, search, category, subjectId, onlyAvailable, limit }),
    queryFn: async () => {
      const result = await libraryApi.listBooks({ schoolId, search, category, subjectId, onlyAvailable, limit });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });

export const useLibraryBorrowers = (schoolId, role) =>
  useQuery({
    queryKey: LIBRARY_BORROWERS_KEY(schoolId, role),
    queryFn: async () => {
      const result = await libraryApi.listBorrowers({ schoolId, role });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });

export const useLibraryLoans = ({ schoolId, status, search, overdueOnly, finePerDay, limit } = {}) =>
  useQuery({
    queryKey: LIBRARY_LOANS_KEY({ schoolId, status, search, overdueOnly, finePerDay, limit }),
    queryFn: async () => {
      const result = await libraryApi.listLoans({ schoolId, status, search, overdueOnly, finePerDay, limit });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 20_000,
  });

export const useLibrarySummary = (schoolId, finePerDay = 0) =>
  useQuery({
    queryKey: LIBRARY_SUMMARY_KEY(schoolId, finePerDay),
    queryFn: () => libraryApi.getLibrarySummary({ schoolId, finePerDay }),
    enabled: !!schoolId,
    staleTime: 20_000,
  });

export const useLibraryResources = ({ schoolId, subjectId, gradeLevelId, search, limit } = {}) =>
  useQuery({
    queryKey: LIBRARY_RESOURCES_KEY({ schoolId, subjectId, gradeLevelId, search, limit }),
    queryFn: async () => {
      const result = await libraryApi.listResources({ schoolId, subjectId, gradeLevelId, search, limit });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });

export const useCreateBook = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await libraryApi.createBook(payload);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const schoolId = data?.school_id;
      qc.invalidateQueries({ queryKey: ['library-books', schoolId] });
      qc.invalidateQueries({ queryKey: ['library-summary', schoolId] });
      toast.success('Book added to library catalog');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create book'),
  });
};

export const useDeleteBook = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }) => {
      const { error } = await libraryApi.deleteBook(id);
      if (error) throw error;
      return { schoolId };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['library-books', schoolId] });
      qc.invalidateQueries({ queryKey: ['library-summary', schoolId] });
      qc.invalidateQueries({ queryKey: ['library-loans', schoolId] });
      toast.success('Book deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete book'),
  });
};

export const useCreateLoan = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const result = await libraryApi.createLoan(payload);
      if (result.error) throw result.error;
      return {
        schoolId: payload.schoolId,
        data: result.data,
      };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['library-books', schoolId] });
      qc.invalidateQueries({ queryKey: ['library-loans', schoolId] });
      qc.invalidateQueries({ queryKey: ['library-summary', schoolId] });
      toast.success('Loan issued');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to issue loan'),
  });
};

export const useRenewLoan = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, newDueDate, schoolId }) => {
      const { data, error } = await libraryApi.renewLoan({ loanId, newDueDate });
      if (error) throw error;
      return { schoolId, data };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['library-loans', schoolId] });
      qc.invalidateQueries({ queryKey: ['library-summary', schoolId] });
      toast.success('Loan renewed');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to renew loan'),
  });
};

export const useReturnLoan = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, returnDate, finePerDay, schoolId }) => {
      const result = await libraryApi.returnLoan({ loanId, returnDate, finePerDay });
      if (result.error) throw result.error;
      return { schoolId, data: result.data };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['library-books', schoolId] });
      qc.invalidateQueries({ queryKey: ['library-loans', schoolId] });
      qc.invalidateQueries({ queryKey: ['library-summary', schoolId] });
      toast.success('Book returned');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to return book'),
  });
};

export const useCreateLibraryResource = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await libraryApi.createResource(payload);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const schoolId = data?.school_id;
      qc.invalidateQueries({ queryKey: ['library-resources', schoolId] });
      toast.success('Resource uploaded');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to upload resource'),
  });
};

export const useDeleteLibraryResource = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }) => {
      const { error } = await libraryApi.deleteResource(id);
      if (error) throw error;
      return { schoolId };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['library-resources', schoolId] });
      toast.success('Resource deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete resource'),
  });
};
