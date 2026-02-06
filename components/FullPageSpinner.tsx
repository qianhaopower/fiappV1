"use client";

export default function FullPageSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 text-muted-foreground">
      {label}
    </div>
  );
}
