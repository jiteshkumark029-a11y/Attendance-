import { format } from 'date-fns';

export const safeFormat = (dateValue: any, formatStr: string, fallback: string = 'N/A') => {
  if (!dateValue) return fallback;
  try {
    let d = dateValue;
    if (typeof dateValue?.toDate === 'function') {
      d = dateValue.toDate();
    } else {
      d = new Date(dateValue);
    }
    if (isNaN(d.getTime())) {
      return fallback;
    }
    return format(d, formatStr);
  } catch (e) {
    return fallback;
  }
};
