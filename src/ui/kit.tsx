// The app's small styled layer over nsh/base, built on the app's theme tokens.

import { Text, View } from "nsh";
import { Button } from "nsh/base";

export function PrimaryButton(props: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Button
      onPress={props.onPress}
      disabled={props.disabled}
      class="rounded-(--radius) bg-primary px-4 py-2 active:opacity-70 disabled:opacity-40"
    >
      <Text class="text-sm font-medium text-primary-foreground">{props.label}</Text>
    </Button>
  );
}

export function SecondaryButton(props: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Button
      onPress={props.onPress}
      disabled={props.disabled}
      class="rounded-(--radius) border border-border bg-secondary px-4 py-2 active:opacity-70 disabled:opacity-40"
    >
      <Text class="text-sm font-medium text-secondary-foreground">{props.label}</Text>
    </Button>
  );
}

export function DangerButton(props: { label: string; onPress?: () => void }) {
  return (
    <Button onPress={props.onPress} class="rounded-(--radius) px-3 py-2 active:opacity-70">
      <Text class="text-sm font-medium text-destructive">{props.label}</Text>
    </Button>
  );
}

export function Card(props: { children?: JSX.Element }) {
  return (
    <View class="gap-2 rounded-(--radius) border border-border bg-card p-4">{props.children}</View>
  );
}

export function Bullet(props: { children?: JSX.Element }) {
  return (
    <View class="flex-row gap-2">
      <Text class="text-[13px] text-muted-foreground">•</Text>
      <View class="flex-1">
        <Text class="text-[13px] text-muted-foreground">{props.children}</Text>
      </View>
    </View>
  );
}
