import { describe, expect, it } from 'vitest';
import { RED_FLAGS } from '../engine';
import {
  answerMedicalCondition,
  answerNoRedFlags,
  answerUnder18,
  eligibilityOf,
  initialScreening,
  isAnswered,
  toggleRedFlag,
} from './screening';

describe('screening state', () => {
  it('starts with every answer unanswered, never "no"', () => {
    expect(initialScreening()).toEqual({ redFlags: null, under18: null, medicalCondition: null });
    expect(isAnswered(initialScreening())).toBe(false);
  });

  it('is finished only when all three questions have an answer', () => {
    let s = answerNoRedFlags(initialScreening());
    expect(isAnswered(s)).toBe(false);
    s = answerUnder18(s, false);
    expect(isAnswered(s)).toBe(false);
    s = answerMedicalCondition(s, false);
    expect(isAnswered(s)).toBe(true);
  });

  it('keeps chosen red flags in the engine order and lets "none" and a flag replace each other', () => {
    let s = toggleRedFlag(initialScreening(), 'numbness');
    s = toggleRedFlag(s, 'swelling');
    expect(s.redFlags).toEqual(['swelling', 'numbness']);
    expect(RED_FLAGS.indexOf('swelling')).toBeLessThan(RED_FLAGS.indexOf('numbness'));
    expect(answerNoRedFlags(s).redFlags).toEqual([]);
    expect(toggleRedFlag(answerNoRedFlags(s), 'weakness').redFlags).toEqual(['weakness']);
  });

  it('unticking the last red flag goes back to unanswered, not to "none"', () => {
    let s = toggleRedFlag(initialScreening(), 'swelling');
    s = toggleRedFlag(s, 'swelling');
    expect(s.redFlags).toBeNull();
    expect(isAnswered(answerMedicalCondition(answerUnder18(s, false), false))).toBe(false);
  });

  it('never changes the state it was given', () => {
    const s = initialScreening();
    toggleRedFlag(s, 'swelling');
    answerUnder18(s, true);
    expect(s).toEqual({ redFlags: null, under18: null, medicalCondition: null });
  });

  it('hands the engine the eligibility answers exactly as given', () => {
    expect(eligibilityOf(initialScreening())).toEqual({ under18: null, medicalCondition: null });
    const s = answerMedicalCondition(answerUnder18(initialScreening(), true), false);
    expect(eligibilityOf(s)).toEqual({ under18: true, medicalCondition: false });
  });
});
