import { RED_FLAGS, type Eligibility, type RedFlag } from '../engine';

/** `null` means "not answered yet", which is different from "no". A plan needs every answer. */
export interface Screening {
  redFlags: RedFlag[] | null;
  under18: boolean | null;
  medicalCondition: boolean | null;
}

export function initialScreening(): Screening {
  return { redFlags: null, under18: null, medicalCondition: null };
}

/** The member ticked "None of these apply". */
export function answerNoRedFlags(s: Screening): Screening {
  return { ...s, redFlags: [] };
}

/**
 * Ticks or unticks one red flag. Unticking the last one goes back to unanswered, never to
 * "none": only "None of these apply" answers that.
 */
export function toggleRedFlag(s: Screening, flag: RedFlag): Screening {
  const chosen = new Set(s.redFlags ?? []);
  if (chosen.has(flag)) chosen.delete(flag);
  else chosen.add(flag);
  const next = RED_FLAGS.filter((f) => chosen.has(f));
  return { ...s, redFlags: next.length === 0 ? null : next };
}

export function answerUnder18(s: Screening, answer: boolean): Screening {
  return { ...s, under18: answer };
}

export function answerMedicalCondition(s: Screening, answer: boolean): Screening {
  return { ...s, medicalCondition: answer };
}

export function eligibilityOf(s: Screening): Eligibility {
  return { under18: s.under18, medicalCondition: s.medicalCondition };
}

/** Every question has an answer. Any "yes" still stops the plan; this only says the screen is finished. */
export function isAnswered(s: Screening): boolean {
  return s.redFlags !== null && s.under18 !== null && s.medicalCondition !== null;
}
