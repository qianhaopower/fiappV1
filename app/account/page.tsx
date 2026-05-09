'use client';

import Link from 'next/link';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { NarrowFormPage } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { useProfile } from '@/contexts/ProfileContext';
import { getPlanLabel } from '@/lib/plans';
import { UpgradeButton } from '@/components/UpgradeButton';

export default function AccountPage() {
  const { user, signOut } = useAuthenticator((ctx) => [ctx.user, ctx.signOut])
  const { profile } = useProfile()

  const email = user?.signInDetails?.loginId ?? user?.username ?? '—'
  const plan = getPlanLabel(profile?.subscriptionStatus)

  async function handleSignOut() {
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore — still proceed with client-side signout
    } finally {
      await signOut()
      window.location.href = '/auth'
    }
  }

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
                <div className="mt-2"><UpgradeButton /></div>
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

        {/* Help */}
        <Card>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Help</p>
            <p className="text-sm text-muted-foreground">
              New to the app or have questions about how it works?
            </p>
            <Button variant="outline" asChild>
              <Link href="/faq">Read the FAQ →</Link>
            </Button>
          </div>
        </Card>

        {/* Data & privacy */}
        <Card>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Data & privacy</p>
            <p className="text-sm text-muted-foreground">
              To request a copy or deletion of your data, email{' '}
              <a href="mailto:hello@friendsintelligence.net?subject=Data%20deletion%20request" className="text-primary underline underline-offset-2">
                hello@friendsintelligence.net
              </a>
              . We action deletion requests within 30 days.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy policy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms of use</Link>
              <Link href="/disclaimer" className="hover:text-foreground transition-colors">Disclaimer</Link>
            </div>
          </div>
        </Card>

        {/* Sign out */}
        <Card>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Session</p>
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              Sign out
            </Button>
          </div>
        </Card>

      </div>
    </NarrowFormPage>
  );
}
