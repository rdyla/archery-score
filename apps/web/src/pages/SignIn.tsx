import { SignIn } from '@clerk/clerk-react';
import { Target } from 'lucide-react';

export function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center">
          <Target size={36} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">Archery Score</h1>
        <p className="text-gray-400 text-center text-sm">
          AI-powered scoring for every end
        </p>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-sm',
            card: 'bg-gray-900 border border-gray-800 shadow-xl rounded-2xl',
            headerTitle: 'text-white',
            headerSubtitle: 'text-gray-400',
            socialButtonsBlockButton:
              'bg-gray-800 border-gray-700 text-white hover:bg-gray-700',
            formButtonPrimary: 'bg-brand-500 hover:bg-brand-600',
            footerActionLink: 'text-brand-500',
            formFieldInput: 'bg-gray-800 border-gray-700 text-white',
            formFieldLabel: 'text-gray-300',
          },
        }}
        redirectUrl="/"
      />
    </div>
  );
}
