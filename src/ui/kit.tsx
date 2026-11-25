// The app's styled layer over nsh/base: a small "console" kit built on the
// theme tokens (background / card / primary / cyber / border / muted ...).

import { Text, View, type JSX } from "nsh";
import { Button } from "nsh/base";

export function PrimaryButton(props: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Button
      onPress={props.onPress}
      disabled={props.disabled}
      class="rounded-(--radius) bg-primary px-4 py-2 shadow-sm transition active:scale-[0.98] active:opacity-90 disabled:opacity-40"
    >
      <Text class="text-sm font-semibold text-primary-foreground">{props.label}</Text>
    </Button>
  );
}

export function SecondaryButton(props: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Button
      onPress={props.onPress}
      disabled={props.disabled}
      class="rounded-(--radius) border border-border bg-secondary px-3.5 py-2 transition active:scale-[0.98] active:opacity-80 disabled:opacity-40"
    >
      <Text class="text-sm font-medium text-secondary-foreground">{props.label}</Text>
    </Button>
  );
}

/** A borderless, quiet button for dense toolbars and card footers. */
export function GhostButton(props: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  class?: string;
}) {
  return (
    <Button
      onPress={props.onPress}
      disabled={props.disabled}
      class={`rounded-(--radius) px-2.5 py-1.5 transition active:bg-accent active:opacity-90 disabled:opacity-40 ${props.class ?? ""}`}
    >
      <Text class="text-xs font-medium text-muted-foreground">{props.label}</Text>
    </Button>
  );
}

export function DangerButton(props: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Button
      onPress={props.onPress}
      disabled={props.disabled}
      class="rounded-(--radius) border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 transition active:scale-[0.98] active:opacity-80"
    >
      <Text class="text-xs font-medium text-destructive">{props.label}</Text>
    </Button>
  );
}

/** A small rounded label, e.g. a status or the "默认" tag. */
export function Chip(props: { label: string; class?: string; textClass?: string }) {
  return (
    <View
      class={`flex-row items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 ${props.class ?? ""}`}
    >
      <Text class={`text-xs font-medium ${props.textClass ?? "text-secondary-foreground"}`}>
        {props.label}
      </Text>
    </View>
  );
}

/** A dot whose color comes from the caller's classes (bg-primary, bg-cyber, ...). */
export function StatusDot(props: { class?: string }) {
  return <View class={`size-2 shrink-0 rounded-full ${props.class ?? "bg-muted-foreground/60"}`} />;
}

/** A bordered surface used for every panel in the console. */
export function Panel(props: { children?: JSX.Element; class?: string }) {
  return (
    <View class={`gap-2 rounded-(--radius) border border-border bg-card p-4 ${props.class ?? ""}`}>
      {props.children}
    </View>
  );
}

/** An uppercase, letter-spaced label for section headers. */
export function SectionLabel(props: { children?: JSX.Element }) {
  return (
    <Text class="text-xs font-semibold uppercase tracking-widest text-muted-foreground font-mono">
      {props.children}
    </Text>
  );
}

export function Bullet(props: { children?: JSX.Element }) {
  return (
    <View class="flex-row gap-2">
      <Text class="text-[13px] text-primary">▸</Text>
      <View class="flex-1">
        <Text class="text-[13px] text-muted-foreground">{props.children}</Text>
      </View>
    </View>
  );
}
