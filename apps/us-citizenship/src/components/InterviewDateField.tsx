import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppIcon } from './AppIcon';
import { useTheme } from '../theme/ThemeProvider';
import { radii, spacing, type } from '../theme/theme';

// One shared field for "when is your interview?" - used in onboarding and in
// Settings so the two never drift. Nobody types a date:
//   iOS     -> tapping the field expands the native inline calendar beneath it
//   Android -> tapping the field opens the system date dialog
//   web     -> MM/DD/YYYY text fallback (web is our design-preview target only;
//              the native picker has no web implementation)
//
// Range is today .. +2 years inclusive; an interview can't be in the past. The web
// fallback enforces the SAME range as the native pickers' minimumDate/maximumDate.
// It used to check only that the text parsed as a real calendar date, so on web you
// could save 01/01/1990 or a date ten years out - values the countdown on Home then
// rendered as a negative or absurd number of days.

export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const formatInterviewDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

function parseUsDate(input: string): Date | null {
  const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [mm, dd, yyyy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(yyyy, mm - 1, dd);
  return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd ? d : null;
}

interface Props {
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
}

const toUsText = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

export function InterviewDateField({ value, onChange, disabled = false }: Props) {
  const { colors, mode } = useTheme();
  const [open, setOpen] = useState(false);
  // Seeded from the stored value so an already-saved date shows up (Settings),
  // not just when the user has typed one this session.
  const [webText, setWebText] = useState(value ? toUsText(value) : '');
  const [webError, setWebError] = useState<string | null>(null);

  const today = new Date();
  const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const maxDate = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate());
  const initial = value ?? new Date(minDate.getTime() + 30 * 86400000);

  // Compared as an ISO string, not as a Date: callers build the prop inline
  // (`value={interviewDate ? fromIsoDate(interviewDate) : null}`) so the object
  // identity changes on every render even when the date has not.
  const valueIso = value ? toIsoDate(value) : '';

  /** The last value this field pushed upward. */
  const reportedIso = useRef(valueIso);
  const report = (d: Date | null) => {
    reportedIso.current = d ? toIsoDate(d) : '';
    onChange(d);
  };

  // Keep the web text box in step with the parent. `webText` was initialised once
  // and never resynchronized, so tapping "Remove date" in Settings cleared the
  // stored date and left the old text sitting in the field, looking saved.
  //
  // Only a change the parent made is copied down. Typing a half-finished date
  // reports null upward, and reacting to that would erase the characters as they
  // were being typed.
  useEffect(() => {
    if (valueIso === reportedIso.current) return;
    reportedIso.current = valueIso;
    setWebText(valueIso ? toUsText(fromIsoDate(valueIso)) : '');
    setWebError(null);
  }, [valueIso]);

  /** Validates typed web input against the same bounds the native pickers enforce. */
  const commitWebText = (t: string) => {
    setWebText(t);
    if (!t.trim()) {
      setWebError(null);
      report(null);
      return;
    }
    const parsed = parseUsDate(t);
    if (!parsed) {
      setWebError('Use MM/DD/YYYY');
      report(null);
      return;
    }
    if (parsed < minDate) {
      setWebError('An interview date cannot be in the past.');
      report(null);
      return;
    }
    if (parsed > maxDate) {
      setWebError('Choose a date within the next two years.');
      report(null);
      return;
    }
    setWebError(null);
    report(parsed);
  };

  const onNativeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'set' && selected) report(selected);
    // iOS inline calendar collapses once a day is tapped; Android's dialog has already closed.
    setOpen(false);
  };

  const press = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: initial, mode: 'date', minimumDate: minDate, maximumDate: maxDate, onChange: onNativeChange });
      return;
    }
    setOpen((v) => !v);
  };

  if (Platform.OS === 'web') {
    return (
      <View>
        <TextInput
          value={webText}
          editable={!disabled}
          onChangeText={commitWebText}
          accessibilityLabel="Interview date, month slash day slash year"
          placeholder="MM/DD/YYYY"
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.field,
            type.body,
            {
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              borderColor: webError ? colors.danger : colors.separator,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        />
        {webError ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[type.caption, { color: colors.danger, marginTop: 6 }]}
          >
            {webError}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <Pressable
        onPress={press}
        disabled={disabled}
        style={({ pressed }) => [
          styles.field,
          styles.row,
          {
            backgroundColor: colors.surface,
            borderColor: open ? colors.accent : colors.separator,
            opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={[type.body, { color: value ? colors.textPrimary : colors.textTertiary }]}>
          {value ? formatInterviewDate(value) : 'Choose a date'}
        </Text>
        <AppIcon name="chevronRight" size={14} color={colors.textTertiary} />
      </Pressable>
      {open && Platform.OS === 'ios' && (
        <View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
          <DateTimePicker
            value={initial}
            mode="date"
            display="inline"
            minimumDate={minDate}
            maximumDate={maxDate}
            onChange={onNativeChange}
            themeVariant={mode === 'dark' ? 'dark' : 'light'}
            accentColor={colors.accent}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerWrap: {
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xs,
    overflow: 'hidden',
  },
});
