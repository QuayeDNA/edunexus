import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 px-4">
      <div className="text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shadow-lg shadow-brand-200">
          E
        </div>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          EduNexus
        </h1>
        <p className="mb-8 text-lg text-slate-500 sm:text-xl">
          Multi-tenant K-12 School Management System
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="px-8">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
      <footer className="absolute bottom-6 text-sm text-slate-400">
        &copy; {new Date().getFullYear()} EduNexus
      </footer>
    </div>
  );
}
