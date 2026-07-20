"use client";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-accent via-background to-accent">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <svg className="w-8 h-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl mb-2 text-foreground">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  );
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function StepIndicator({ currentStep, totalSteps = 2 }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {step}
            </div>
            {index < totalSteps - 1 && (
              <div className={`w-12 h-0.5 transition-colors ${
                currentStep > step ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface AuthCardProps {
  children: React.ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="bg-card rounded-2xl shadow-lg p-8">
      {children}
    </div>
  );
}

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function AuthInput({ label, id, ...props }: AuthInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm mb-2 text-foreground">
        {label}
      </label>
      <input
        id={id}
        className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
        {...props}
      />
    </div>
  );
}

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function AuthButton({ variant = 'primary', children, className = '', ...props }: AuthButtonProps) {
  const baseClasses = "py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 font-medium";
  const variantClasses = variant === 'primary'
    ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/60"
    : "bg-muted text-foreground hover:bg-muted/80";

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
