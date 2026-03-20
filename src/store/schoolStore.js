import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSchoolStore = create(
  persist(
    (set, get) => ({
      // Active school
      activeSchoolId: null,
      activeSchool: null,
      setActiveSchool: (schoolId) => set({ activeSchoolId: schoolId }),
      setSchoolData: (school) => set({ activeSchool: school, activeSchoolId: school?.id }),
      clearSchool: () => set({ activeSchoolId: null, activeSchool: null }),

      // Current academic context
      currentAcademicYear: null,
      currentTerm: null,
      setCurrentAcademicYear: (year) => set({ currentAcademicYear: year }),
      setCurrentTerm: (term) => set({ currentTerm: term }),

      // Derived helpers
      getCurriculumMode: () => get().activeSchool?.curriculum_mode ?? 'ghana_basic',
      getGradingSystem: () => get().activeSchool?.grading_system ?? 'ghana_basic',
      getCurrencyCode: () => get().activeSchool?.currency_code ?? 'GHS',
      getCalendarMode: () => get().activeSchool?.calendar_mode ?? 'trimester',
      getSchoolName: () => get().activeSchool?.name ?? 'EduNexus',
    }),
    {
      name: 'edunexus-school',
      partialize: (state) => ({
        activeSchoolId: state.activeSchoolId,
        currentAcademicYear: state.currentAcademicYear,
        currentTerm: state.currentTerm,
      }),
    }
  )
);
