import { useUser, useClerk } from '@clerk/clerk-react';
import { LogOut, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function ProfilePage() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white">Profile</h1>
      </div>

      {/* Avatar + name */}
      <Card>
        <CardContent className="py-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-800 overflow-hidden shrink-0">
            {user?.imageUrl && (
              <img src={user.imageUrl} alt="avatar" className="w-full h-full object-cover" />
            )}
          </div>
          <div>
            <div className="text-lg font-bold text-white">{user?.fullName}</div>
            <div className="text-sm text-gray-500">
              {user?.primaryEmailAddress?.emailAddress}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings rows */}
      <Card>
        <CardContent className="py-0 divide-y divide-gray-800">
          {[
            { label: 'Notifications', value: 'Off' },
            { label: 'Default round', value: 'Vegas 300' },
            { label: 'About', value: 'v1.0.0' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-4"
            >
              <span className="text-white">{label}</span>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-sm">{value}</span>
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        variant="danger"
        className="w-full"
        onClick={() => signOut({ redirectUrl: '/sign-in' })}
      >
        <LogOut size={18} className="mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
