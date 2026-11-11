import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ChangeStatus } from '@/ai/agent/conversation';
import type { StagedChange } from '@/domain/assistant/changeset';
import { colors, MIN_TOUCH, radius, space } from '@/theme/tokens';

import { Button } from './button';
import { Text } from './text';

interface Props {
  staged: StagedChange[];
  status: ChangeStatus;
  failures?: string[];
  onApply(selected: ReadonlySet<string>): void;
  onDiscard(): void;
  onUndo(): void;
}

const STATUS: Record<Exclude<ChangeStatus, 'pending'>, string> = {
  applied: 'Applied',
  discarded: 'Not applied',
  undone: 'Undone',
  expired: 'Not applied',
};

/** The assistant's proposed changes: nothing happens until the user applies them. */
export function ChangesCard({ staged, status, failures, onApply, onDiscard, onUndo }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(staged.map((c) => c.id)));
  const pending = status === 'pending';
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <View style={styles.card}>
      <Text variant="label" muted>
        {pending ? `Proposed · ${staged.length} ${staged.length === 1 ? 'change' : 'changes'}` : STATUS[status]}
      </Text>
      {staged.map((c) => {
        const on = selected.has(c.id);
        return (
          <Pressable
            key={c.id}
            disabled={!pending}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled: !pending }}
            accessibilityLabel={`${c.label}. ${c.detail}`}
            onPress={() => toggle(c.id)}
            style={styles.row}>
            {pending ? (
              <View style={[styles.box, on && styles.boxOn]}>{on ? <Text style={styles.tick}>✓</Text> : null}</View>
            ) : (
              <Text style={styles.bullet}>{status === 'applied' && on ? '✓' : '·'}</Text>
            )}
            <View style={styles.flex}>
              <Text style={!pending || on ? undefined : { color: colors.textMuted }}>{c.label}</Text>
              {c.detail ? (
                <Text variant="small" muted>
                  {c.detail}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
      {failures?.map((f) => (
        <Text key={f} variant="small" style={{ color: colors.warning }}>
          {f}
        </Text>
      ))}
      {pending ? (
        <View style={styles.actions}>
          <Button
            compact
            label={selected.size === 0 ? 'Nothing selected' : `Apply ${selected.size}`}
            disabled={selected.size === 0}
            onPress={() => onApply(selected)}
          />
          <Button compact tone="quiet" label="Discard" onPress={onDiscard} />
        </View>
      ) : status === 'applied' ? (
        <Button compact tone="quiet" label="Undo" style={styles.left} onPress={onUndo} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, padding: space.md, gap: space.xs },
  row: { flexDirection: 'row', gap: space.md, minHeight: MIN_TOUCH - 8, paddingVertical: space.xs, alignItems: 'flex-start' },
  box: { width: 20, height: 20, marginTop: 2, borderRadius: 5, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.accent },
  tick: { color: colors.onAccent, fontSize: 13, lineHeight: 15, fontWeight: '700' },
  bullet: { width: 20, textAlign: 'center', color: colors.accent, fontWeight: '700' },
  flex: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  left: { alignSelf: 'flex-start' },
});
