'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function SchoolDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['school', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/schools/${params.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">School not found</div>;

  return (
    <div>
      <PageHeader title={data.name} description={`Code: ${data.code} | Slug: ${data.slug}`}>
        <Button onClick={() => router.push(`/schools/${params.id}/edit`)}>Edit School</Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {data.email && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 py-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Email</CardTitle>
            </CardHeader>
            <CardContent className="py-2"><p className="text-sm">{data.email}</p></CardContent>
          </Card>
        )}
        {data.phone && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 py-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Phone</CardTitle>
            </CardHeader>
            <CardContent className="py-2"><p className="text-sm">{data.phone}</p></CardContent>
          </Card>
        )}
        {data.region && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 py-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Region</CardTitle>
            </CardHeader>
            <CardContent className="py-2"><p className="text-sm">{data.region}</p></CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-2 gap-4">
                <div><dt className="text-sm text-muted-foreground">Curriculum</dt><dd className="font-medium">{data.curriculum}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Calendar</dt><dd className="font-medium">{data.calendar}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Status</dt><dd className="font-medium">{data.isActive ? 'Active' : 'Inactive'}</dd></div>
                {data.address && <div><dt className="text-sm text-muted-foreground">Address</dt><dd className="font-medium">{data.address}</dd></div>}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <p className="text-sm text-muted-foreground">Users will be listed here after Phase 3.</p>
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <p className="text-sm text-muted-foreground">Subscriptions will be managed once billing is active.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
