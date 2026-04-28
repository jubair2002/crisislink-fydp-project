import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Admin Login · CrisisLink',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-surface-muted">
      <section className="hidden lg:flex flex-col justify-between bg-sidebar text-white p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand grid place-items-center font-bold text-lg">
            C
          </div>
          <span className="text-lg font-semibold tracking-tight">CrisisLink</span>
        </div>

        <div className="space-y-6 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Coordinate disaster response in real time.
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">
            Monitor active disasters, vet volunteers, oversee fundraising campaigns and triage
            citizen reports — all from a single admin console.
          </p>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary" />
              Live disaster monitoring &amp; resource dispatch
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary" />
              Volunteer verification &amp; campaign oversight
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary" />
              Donations, reports and chat in one place
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} CrisisLink Disaster Management Platform
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
