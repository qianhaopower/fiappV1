'use client';

import Link from 'next/link';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { NarrowFormPage } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { useProfile } from '@/contexts/ProfileContext';
import { getPlanLabel } from '@/lib/plans';

export default function AccountPage() {
  const { user, signOut } = useAuthenticator((ctx) => [ctx.user, ctx.signOut])
  const { profile } = useProfile()

  const email = user?.signInDetails?.loginId ?? user?.username ?? '—'
  const plan = getPlanLabel(profile?.subscriptionStatus)

  return (
    <NarrowFormPage title="Account" description="Your profile and settings.">
      <div className="space-y-4">

        {/* Identity */}
        <Card>
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Profile</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                <p className="text-sm font-medium text-foreground">{email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Plan</p>
                <p className="text-sm font-medium text-foreground">{plan}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Assessment */}
        <Card>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Assessment</p>
            <p className="text-sm text-muted-foreground">
              Retake the assessment to update your focus pillar and get fresh practice suggestions.
            </p>
            <Button variant="outline" asChild>
              <Link href="/assessment">Retake assessment →</Link>
            </Button>
          </div>
        </Card>

        {/* Sign out */}
        <Card>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Session</p>
            <Button variant="outline" onClick={signOut} className="w-full">
              Sign out
            </Button>
          </div>
        </Card>

      </div>
    </NarrowFormPage>
  );
}
