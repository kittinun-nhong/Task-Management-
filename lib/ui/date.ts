import dayjs from 'dayjs';

/** Thai month abbreviations, indexed 0 (ม.ค.) … 11 (ธ.ค.). */
export const THAI_MONTHS_ABBR = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
] as const;

/** Normalise a Date (or ISO string) to a `YYYY-MM-DD` string for storage. */
export function toISODate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d.format('YYYY-MM-DD') : null;
}

/** Parse a stored `YYYY-MM-DD` string back into a Date for the pickers. */
export function fromISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d.toDate() : null;
}

function thaiDay(d: dayjs.Dayjs, withMonth: boolean): string {
  return withMonth ? `${d.date()} ${THAI_MONTHS_ABBR[d.month()]}` : String(d.date());
}

/**
 * Human Thai range, e.g. "23–29 มิ.ย." (same month) or "29 ก.ค. – 4 ส.ค."
 * (across months). Falls back to a single date or "—" when data is missing.
 */
export function thaiRange(start: string | null | undefined, end: string | null | undefined): string {
  const s = start ? dayjs(start) : null;
  const e = end ? dayjs(end) : null;
  if (s?.isValid() && e?.isValid()) {
    const sameMonth = s.month() === e.month() && s.year() === e.year();
    return sameMonth
      ? `${thaiDay(s, false)}–${thaiDay(e, true)}`
      : `${thaiDay(s, true)} – ${thaiDay(e, true)}`;
  }
  const one = s?.isValid() ? s : e?.isValid() ? e : null;
  return one ? thaiDay(one, true) : '—';
}
