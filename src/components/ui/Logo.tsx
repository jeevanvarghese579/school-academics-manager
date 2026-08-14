import { GraduationCap } from 'lucide-react';

export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-e2 ${className}`}
      style={{ width: size, height: size }}
    >
      <GraduationCap style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2} />
    </div>
  );
}

export function LogoFull({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo size={44} />
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">SAM</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">Students Academics Manager</p>
      </div>
    </div>
  );
}
