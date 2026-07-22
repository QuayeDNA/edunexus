'use client';

import { useState } from 'react';
import { StaffTable } from './staff-table';
import { ConfirmDeactivateDialog } from './confirm-deactivate-dialog';

interface StaffRow {
  id: string; staffIdNumber: string; firstName: string; lastName: string;
  role: string; department: string | null; status: string; phone: string; email: string | null;
}

interface Props {
  initialData: StaffRow[];
}

export function StaffPageClient({ initialData }: Props) {
  const [deactivating, setDeactivating] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
      <StaffTable data={initialData} onDeactivate={(id, name) => setDeactivating({ id, name })} />
      <ConfirmDeactivateDialog
        open={!!deactivating}
        onOpenChange={() => setDeactivating(null)}
        staffId={deactivating?.id ?? ''}
        staffName={deactivating?.name ?? ''}
      />
    </>
  );
}
