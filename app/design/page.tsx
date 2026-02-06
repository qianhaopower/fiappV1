'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Switch } from '@/components/ui';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Textarea } from '@/components/ui';
import { StandardPage, PageSection, PageCard } from '@/components/layout';
import {
  Card,
  StatCard,
  EmptyState,
  ToastTrigger,
  ConfirmDialog,
  SkeletonList,
  SkeletonCard,
  SkeletonPage,
} from '@/components/ui';

export default function DesignPage() {
  const [checkboxState, setCheckboxState] = useState(false);
  const [switchState, setSwitchState] = useState(false);

  return (
    <StandardPage 
      title="Design System" 
      description="FIApp UI Component Library - Calm, professional, accessible components for wellbeing products"
      metaLabel="SYSTEM"
    >
      {/* Colors Section */}
      <PageSection 
        title="Color Palette"
        description="FIApp Theme - Calm, professional, wellbeing-focused"
        metaLabel="TOKENS"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { name: 'Background', hex: '#f7f5f1', color: 'bg-background' },
            { name: 'Card', hex: '#fdfdfd', color: 'bg-card', border: true },
            { name: 'Primary (Teal)', hex: '#5b9fb8', color: 'bg-primary' },
            { name: 'Foreground', hex: '#2a2a2a', color: 'bg-foreground' },
            { name: 'Secondary (Emerald)', hex: '#6bbd9b', color: 'bg-secondary' },
            { name: 'Accent (Amber)', hex: '#c7932a', color: 'bg-accent' },
            { name: 'Destructive (Red)', hex: '#a85445', color: 'bg-destructive' },
            { name: 'Border', hex: '#e0e1e4', color: 'bg-border' },
          ].map((item) => (
            <div key={item.name} className="group">
              <div className={`h-32 rounded-xl mb-3 shadow-sm border border-border ${item.color} ${item.border ? 'border-border' : ''}`}></div>
              <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
            </div>
          ))}
        </div>
      </PageSection>

      {/* Typography Section */}
      <PageSection 
        title="Typography"
        description="Professional type scale with Inter font"
        metaLabel="TYPE"
      >
        <PageCard className="shadow-sm hover:shadow-md transition-shadow">
          <div className="divide-y divide-border">
            <div className="p-6 hover:bg-muted/20 transition-colors">
              <h1 className="text-5xl font-bold text-foreground mb-2">Display / H1</h1>
              <p className="text-xs text-muted-foreground">text-5xl font-bold</p>
            </div>
            <div className="p-6 hover:bg-muted/20 transition-colors">
              <h2 className="text-4xl font-bold text-foreground mb-2">Heading 2</h2>
              <p className="text-xs text-muted-foreground">text-4xl font-bold</p>
            </div>
            <div className="p-6 hover:bg-muted/20 transition-colors">
              <h3 className="text-2xl font-semibold text-foreground mb-2">Heading 3</h3>
              <p className="text-xs text-muted-foreground">text-2xl font-semibold</p>
            </div>
            <div className="p-6 hover:bg-muted/20 transition-colors">
              <p className="text-lg text-foreground mb-2">Body text - The quick brown fox jumps over the lazy dog</p>
              <p className="text-xs text-muted-foreground">text-lg</p>
            </div>
            <div className="p-6 hover:bg-muted/20 transition-colors">
              <p className="text-base text-foreground/80 mb-2">Small text - The quick brown fox jumps over the lazy dog</p>
              <p className="text-xs text-muted-foreground">text-base</p>
            </div>
            <div className="p-6 hover:bg-muted/20 transition-colors">
              <p className="text-sm text-muted-foreground mb-2">Caption - The quick brown fox jumps over the lazy dog</p>
              <p className="text-xs text-muted-foreground">text-sm</p>
            </div>
          </div>
        </PageCard>
      </PageSection>

      {/* Buttons Section */}
      <PageSection 
        title="Buttons"
        description="All button variants with hover, active, and disabled states"
        metaLabel="COMPONENTS"
      >
        <PageCard className="shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-6">
            {/* Primary Buttons */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Primary</h3>
              <div className="flex flex-wrap gap-4">
                <Button>Primary Button</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>

            {/* Secondary Buttons */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Secondary</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="secondary" disabled>Disabled</Button>
              </div>
            </div>

            {/* Outline Buttons */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Outline / Ghost</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline">Outline Button</Button>
                <Button variant="outline" disabled>Disabled</Button>
              </div>
            </div>

            {/* Destructive Buttons */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Destructive</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="destructive">Delete</Button>
                <Button variant="destructive" disabled>Disabled</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Sizes</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <Button size="sm">Small</Button>
                <Button size="default">Medium (Default)</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>
          </div>
        </PageCard>
      </PageSection>

      {/* Inputs Section */}
      <PageSection 
        title="Form Controls"
        description="Inputs, selects, checkboxes, and switches with states"
        metaLabel="FORMS"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">
          {/* Left Column */}
          <PageCard className="w-full lg:max-w-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-6">
              <div>
                <Label htmlFor="text-input">Text Input</Label>
                <Input 
                  id="text-input"
                  type="text" 
                  placeholder="Enter text..."
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="email-input">Email Input</Label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="your@email.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="textarea">Textarea</Label>
                <Textarea
                  id="textarea"
                  placeholder="Enter your message..."
                  rows={4}
                  className="mt-2 resize-none"
                />
              </div>

              <div>
                <Label htmlFor="select">Select Dropdown</Label>
                <Select>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opt1">Option 1</SelectItem>
                    <SelectItem value="opt2">Option 2</SelectItem>
                    <SelectItem value="opt3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PageCard>

          {/* Right Column */}
          <PageCard className="w-full lg:max-w-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-4">Checkbox</h3>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="checkbox-1"
                    checked={checkboxState}
                    onCheckedChange={setCheckboxState}
                  />
                  <Label htmlFor="checkbox-1" className="cursor-pointer">
                    I agree to the terms and conditions
                  </Label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-4">Switch</h3>
                <div className="flex items-center space-x-3">
                  <Switch
                    id="switch-1"
                    checked={switchState}
                    onCheckedChange={setSwitchState}
                  />
                  <Label htmlFor="switch-1" className="cursor-pointer">
                    Enable notifications
                  </Label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-4">Multiple Checkboxes</h3>
                <div className="space-y-3">
                  {['Option A', 'Option B', 'Option C'].map((opt) => (
                    <div key={opt} className="flex items-center space-x-3">
                      <Checkbox id={`check-${opt}`} />
                      <Label htmlFor={`check-${opt}`} className="cursor-pointer">
                        {opt}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-4">Disabled States</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="disabled-check" disabled />
                    <Label htmlFor="disabled-check" className="cursor-not-allowed opacity-50">
                      Disabled checkbox
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch id="disabled-switch" disabled />
                    <Label htmlFor="disabled-switch" className="cursor-not-allowed opacity-50">
                      Disabled switch
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </PageCard>
        </div>
      </PageSection>

      {/* Spacing & Cards Section */}
      <PageSection 
        title="Spacing & Card Styles"
        description="Professional card patterns with consistent styling"
        metaLabel="LAYOUT"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-foreground mb-2 text-sm">Small</h3>
            <p className="text-sm text-muted-foreground">p-4 rounded-xl</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-foreground mb-2">Medium</h3>
            <p className="text-sm text-muted-foreground">p-6 rounded-xl</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-8 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-foreground mb-2">Large</h3>
            <p className="text-sm text-muted-foreground">p-8 rounded-xl</p>
          </div>
        </div>
      </PageSection>

      {/* Interactive States Section */}
      <PageSection 
        title="Interactive States"
        description="Demonstrating focus, hover, and error states"
        metaLabel="STATES"
      >
        <PageCard className="shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Focus States</h3>
              <p className="text-sm text-muted-foreground mb-4">All inputs show consistent teal/indigo focus ring</p>
              <Input placeholder="Click here to see focus ring..." />
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Error State</h3>
              <Label htmlFor="error-input">Email with error</Label>
              <Input
                id="error-input"
                type="email"
                placeholder="Invalid email"
                defaultValue="test"
                className="mt-2 border-destructive ring-destructive/30"
                readOnly
              />
              <p className="text-sm text-destructive mt-2">Please enter a valid email address</p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Success State</h3>
              <Label htmlFor="success-input">Email (valid)</Label>
              <Input
                id="success-input"
                type="email"
                placeholder="valid@email.com"
                defaultValue="user@example.com"
                className="mt-2 border-accent ring-accent/30"
                readOnly
              />
              <p className="text-sm text-accent mt-2">✓ Email verified</p>
            </div>
          </div>
        </PageCard>
      </PageSection>

      {/* Content Primitives Section */}
      <PageSection
        title="Content Primitives"
        description="Reusable building blocks for consistent pages"
        metaLabel="PRIMITIVES"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card variant="default">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CARD</p>
                <p className="text-sm text-muted-foreground">Default card for general content.</p>
              </div>
            </Card>

            <Card variant="subtle">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CARD</p>
                <p className="text-sm text-muted-foreground">Subtle card for secondary content.</p>
              </div>
            </Card>

            <Card variant="interactive">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CARD</p>
                <p className="text-sm text-muted-foreground">Interactive card with hover elevation.</p>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <StatCard label="Streak" value="12" helper="Days" />
              <StatCard label="Mood" value="+18%" helper="This week" />
            </div>

            <EmptyState
              title="No entries yet"
              text="Start your first reflection to see progress here."
              action={<Button size="sm">Create entry</Button>}
            />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PageCard className="shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-wrap gap-3">
              <ToastTrigger />
              <ConfirmDialog
                trigger={<Button variant="outline">Open Dialog</Button>}
                title="Confirm action"
                description="Are you sure you want to continue?"
              />
            </div>
          </PageCard>

          <PageCard className="shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-6">
              <SkeletonList />
              <SkeletonCard />
            </div>
          </PageCard>
        </div>

        <div className="mt-10">
          <PageCard className="shadow-sm hover:shadow-md transition-shadow">
            <SkeletonPage />
          </PageCard>
        </div>
      </PageSection>

      {/* Footer Spacing */}
      <div className="py-8"></div>
    </StandardPage>
  );
}
