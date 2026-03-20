import { useQuery } from '@tanstack/react-query';
import { schoolsApi } from '../services/api/schools.js';
import { academicYearsApi } from '../services/api/academicYears.js';
import { useSchoolStore } from '../store/schoolStore.js';
import { useEffect } from 'react';

export const useSchoolData = (schoolId) => {
  const { setSchoolData } = useSchoolStore();

  const query = useQuery({
    queryKey: ['school', schoolId],
    queryFn: () => schoolsApi.getById(schoolId),
    enabled: !!schoolId,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (query.data) setSchoolData(query.data);
  }, [query.data, setSchoolData]);

  return query;
};

export const useCurrentTerm = (schoolId) => {
  const { setCurrentTerm, setCurrentAcademicYear } = useSchoolStore();

  const query = useQuery({
    queryKey: ['current-term', schoolId],
    queryFn: () => academicYearsApi.getCurrentTerm(schoolId),
    enabled: !!schoolId,
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (query.data) {
      setCurrentTerm(query.data);
      if (query.data.academic_years) {
        setCurrentAcademicYear(query.data.academic_years);
      }
    }
  }, [query.data, setCurrentTerm, setCurrentAcademicYear]);

  return query;
};

export const useAcademicYears = (schoolId) =>
  useQuery({
    queryKey: ['academic-years', schoolId],
    queryFn: () => academicYearsApi.list(schoolId),
    enabled: !!schoolId,
    staleTime: 10 * 60_000,
  });
