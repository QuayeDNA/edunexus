import { Dexie, type EntityTable } from 'dexie';

export interface DexieStudent {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  classId: string;
  admissionNumber: string;
  syncStatus: 'pending' | 'synced' | 'error';
  updatedAt: string;
}

export interface DexieStaff {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  syncStatus: 'pending' | 'synced' | 'error';
  updatedAt: string;
}

export interface DexieClass {
  id: string;
  schoolId: string;
  name: string;
  academicYearId: string;
  teacherId: string | null;
  syncStatus: 'pending' | 'synced' | 'error';
  updatedAt: string;
}

export interface DexieAttendance {
  id: string;
  schoolId: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  syncStatus: 'pending' | 'synced' | 'error';
  updatedAt: string;
}

export interface DexieAssessmentScore {
  id: string;
  schoolId: string;
  studentId: string;
  subjectId: string;
  term: number;
  academicYearId: string;
  score: number;
  maxScore: number;
  syncStatus: 'pending' | 'synced' | 'error';
  updatedAt: string;
}

export interface DexiePayment {
  id: string;
  schoolId: string;
  studentId: string;
  amount: number;
  feeType: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionRef: string | null;
  syncStatus: 'pending' | 'synced' | 'error';
  updatedAt: string;
}

export interface DexieAnnouncement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  audience: string;
  createdAt: string;
  syncStatus: 'pending' | 'synced' | 'error';
  updatedAt: string;
}

export interface DexieNotification {
  id: string;
  userId: string;
  schoolId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  syncStatus: 'pending' | 'synced' | 'error';
  updatedAt: string;
}

export interface DexieSyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  table: string;
  recordId: string;
  payload: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastError: string | null;
}

export interface DexieCachedQuery {
  id?: number;
  key: string;
  data: string;
  createdAt: string;
  expiresAt: string;
}

export class EduNexusDatabase extends Dexie {
  students!: EntityTable<DexieStudent, 'id'>;
  staff!: EntityTable<DexieStaff, 'id'>;
  classes!: EntityTable<DexieClass, 'id'>;
  attendance!: EntityTable<DexieAttendance, 'id'>;
  assessmentScores!: EntityTable<DexieAssessmentScore, 'id'>;
  payments!: EntityTable<DexiePayment, 'id'>;
  announcements!: EntityTable<DexieAnnouncement, 'id'>;
  notifications!: EntityTable<DexieNotification, 'id'>;
  syncQueue!: EntityTable<DexieSyncQueueItem, 'id'>;
  cachedQueries!: EntityTable<DexieCachedQuery, 'id'>;

  constructor() {
    super('EduNexusV2');
    this.version(1).stores({
      students: 'id, schoolId, classId, syncStatus, updatedAt',
      staff: 'id, schoolId, syncStatus, updatedAt',
      classes: 'id, schoolId, syncStatus, updatedAt',
      attendance: 'id, schoolId, studentId, date, syncStatus, updatedAt',
      assessmentScores: 'id, schoolId, studentId, subjectId, syncStatus, updatedAt',
      payments: 'id, schoolId, studentId, status, syncStatus, updatedAt',
      announcements: 'id, schoolId, syncStatus, updatedAt',
      notifications: 'id, userId, schoolId, read, syncStatus, updatedAt',
      syncQueue: '++id, createdAt',
      cachedQueries: '++id, key, expiresAt',
    });
  }
}

export const dexieDb = new EduNexusDatabase();