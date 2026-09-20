import type { Muscle } from '../../engine';

export type MoveKind = 'light-movement' | 'self-massage' | 'mobility' | 'stretch';
export type EvidenceTag = 'ROM' | 'COMFORT';

export interface Move {
  id: string;
  name: string;
  kind: MoveKind;
  muscles: Muscle[];
  how: string;
  dose: string;
}

/**
 * The evidence tag follows from the kind of move, so a card cannot claim more than the evidence
 * supports: stretching is tagged for range of motion only, everything else for comfort only.
 * There is deliberately no soreness tag.
 */
export function evidenceFor(kind: MoveKind): EvidenceTag {
  return kind === 'stretch' ? 'ROM' : 'COMFORT';
}

const HOLD = '2 to 3 holds of 20 to 30 seconds';

// Hand-written general wellness ideas. Needs a trainer or PT review before any demo.
export const MOVES: readonly Move[] = [
  {
    id: 'easy-walk',
    name: 'Easy walk',
    kind: 'light-movement',
    muscles: ['quads', 'glutes', 'hamstrings', 'calves', 'adductors', 'core'],
    how: 'Walk on flat ground at a pace where you could hold a conversation.',
    dose: '10 to 20 minutes',
  },
  {
    id: 'easy-spin',
    name: 'Easy spin on a bike',
    kind: 'light-movement',
    muscles: ['quads', 'glutes', 'hamstrings', 'calves'],
    how: 'Pedal seated with light resistance and a relaxed cadence.',
    dose: '10 to 15 minutes',
  },

  // Chest
  {
    id: 'chest-ball-release',
    name: 'Ball pec release',
    kind: 'self-massage',
    muscles: ['chest'],
    how: 'Stand facing a wall with a soft ball between the wall and your chest. Lean in lightly and roll slowly. Skip any sharp spot.',
    dose: '1 minute per side',
  },
  {
    id: 'chest-arm-swings',
    name: 'Easy arm swings',
    kind: 'mobility',
    muscles: ['chest', 'shoulders'],
    how: 'Stand tall and swing both arms open, then gently across your chest, staying relaxed.',
    dose: '10 to 15 swings',
  },
  {
    id: 'chest-doorway-stretch',
    name: 'Doorway chest stretch',
    kind: 'stretch',
    muscles: ['chest'],
    how: 'Rest a forearm on a door frame with the elbow at shoulder height. Step through until you feel a mild stretch. Ease off if you feel a pinch at the front of the shoulder.',
    dose: `${HOLD} per side`,
  },

  // Shoulders
  {
    id: 'shoulder-ball-release',
    name: 'Ball shoulder release',
    kind: 'self-massage',
    muscles: ['shoulders'],
    how: 'Lean the back of your shoulder against a wall with a soft ball in between. Roll slowly with light pressure.',
    dose: '1 minute per side',
  },
  {
    id: 'shoulder-rolls',
    name: 'Shoulder rolls',
    kind: 'mobility',
    muscles: ['shoulders', 'upperBack'],
    how: 'Roll your shoulders up, back and down in slow circles.',
    dose: '10 rolls each direction',
  },
  {
    id: 'shoulder-cross-body-stretch',
    name: 'Cross-body shoulder stretch',
    kind: 'stretch',
    muscles: ['shoulders'],
    how: 'Bring one arm across your chest and hold it with the other arm. Keep the shoulder down.',
    dose: `${HOLD} per side`,
  },

  // Biceps
  {
    id: 'biceps-thumb-glide',
    name: 'Biceps thumb glide',
    kind: 'self-massage',
    muscles: ['biceps'],
    how: 'Use the thumb of your other hand to glide slowly along the front of your upper arm with light pressure.',
    dose: '1 minute per arm',
  },
  {
    id: 'elbow-bends',
    name: 'Easy elbow bends',
    kind: 'mobility',
    muscles: ['biceps', 'triceps'],
    how: 'Slowly bend and straighten your elbow through a comfortable range.',
    dose: '10 to 15 reps per arm',
  },
  {
    id: 'biceps-wall-stretch',
    name: 'Wall biceps stretch',
    kind: 'stretch',
    muscles: ['biceps'],
    how: 'Place your palm on a wall behind you with the fingers pointing back, then turn your body gently away. Ease off if you feel a pinch at the front of the shoulder.',
    dose: `${HOLD} per arm`,
  },

  // Triceps
  {
    id: 'triceps-palm-glide',
    name: 'Triceps palm glide',
    kind: 'self-massage',
    muscles: ['triceps'],
    how: 'Use your opposite hand to glide slowly along the back of your upper arm with light pressure.',
    dose: '1 minute per arm',
  },
  {
    id: 'overhead-reaches',
    name: 'Overhead arm reaches',
    kind: 'mobility',
    muscles: ['triceps', 'shoulders'],
    how: 'Reach one arm overhead, then lower it slowly. Alternate arms.',
    dose: '10 reps per arm',
  },
  {
    id: 'triceps-overhead-stretch',
    name: 'Overhead triceps stretch',
    kind: 'stretch',
    muscles: ['triceps'],
    how: 'Raise one arm and bend the elbow behind your head. Gently press it back with the other hand.',
    dose: `${HOLD} per arm`,
  },

  // Forearms
  {
    id: 'forearm-thumb-glide',
    name: 'Forearm thumb glide',
    kind: 'self-massage',
    muscles: ['forearms'],
    how: 'Glide your opposite thumb slowly along the forearm from wrist to elbow with light pressure.',
    dose: '1 minute per arm',
  },
  {
    id: 'wrist-circles',
    name: 'Wrist circles',
    kind: 'mobility',
    muscles: ['forearms'],
    how: 'Make slow circles with your wrists in both directions.',
    dose: '10 circles each way',
  },
  {
    id: 'wrist-flexor-stretch',
    name: 'Wrist flexor stretch',
    kind: 'stretch',
    muscles: ['forearms'],
    how: 'Hold one arm straight in front with the palm up. Gently pull the fingers back with the other hand.',
    dose: `${HOLD} per arm`,
  },

  // Upper back
  {
    id: 'upper-back-foam-roll',
    name: 'Foam roll upper back',
    kind: 'self-massage',
    muscles: ['upperBack'],
    how: 'Lie with a foam roller under your upper back and support your head with your hands. Lift your hips and roll slowly, keeping your neck relaxed and avoiding the lower back.',
    dose: '1 to 2 minutes',
  },
  {
    id: 'cat-cow',
    name: 'Cat-cow',
    kind: 'mobility',
    muscles: ['upperBack', 'core'],
    how: 'On hands and knees, slowly round your back, then let it dip. Move with your breath.',
    dose: '8 to 10 slow reps',
  },
  {
    id: 'childs-pose-reach',
    name: "Child's pose reach",
    kind: 'stretch',
    muscles: ['upperBack'],
    how: 'Sit back on your heels and reach your arms forward along the floor. Breathe slowly.',
    dose: HOLD,
  },

  // Core
  {
    id: 'pelvic-tilts',
    name: 'Pelvic tilts',
    kind: 'mobility',
    muscles: ['core'],
    how: 'Lie on your back with your knees bent. Gently flatten, then arch, your lower back.',
    dose: '10 slow reps',
  },
  {
    id: 'prone-press-up',
    name: 'Gentle prone press-up',
    kind: 'stretch',
    muscles: ['core'],
    how: 'Lie face down and prop yourself on your forearms, keeping your hips down. Stop if anything pinches.',
    dose: '2 to 3 holds of 15 to 20 seconds',
  },

  // Glutes
  {
    id: 'glute-ball-release',
    name: 'Ball glute release',
    kind: 'self-massage',
    muscles: ['glutes'],
    how: 'Sit on a soft ball against a wall or the floor and shift slowly. Use light pressure.',
    dose: '1 to 2 minutes per side',
  },
  {
    id: 'hip-circles',
    name: 'Hip circles',
    kind: 'mobility',
    muscles: ['glutes', 'adductors'],
    how: 'Standing and holding a support, draw slow circles with a bent knee.',
    dose: '8 circles each direction per leg',
  },
  {
    id: 'figure-four-stretch',
    name: 'Figure-four stretch',
    kind: 'stretch',
    muscles: ['glutes'],
    how: 'Lying on your back, cross one ankle over the opposite knee and draw both legs gently toward you.',
    dose: `${HOLD} per side`,
  },

  // Quads
  {
    id: 'quads-foam-roll',
    name: 'Foam roll quads',
    kind: 'self-massage',
    muscles: ['quads'],
    how: 'Lie face down with a foam roller under your thighs. Roll slowly from the hip to just above the knee.',
    dose: '1 to 2 minutes per leg',
  },
  {
    id: 'small-leg-swings',
    name: 'Small leg swings',
    kind: 'mobility',
    muscles: ['quads', 'hamstrings'],
    how: 'Holding a support, swing one leg forward and back in a small, easy range.',
    dose: '10 swings per leg',
  },
  {
    id: 'quad-stretch',
    name: 'Standing quad stretch',
    kind: 'stretch',
    muscles: ['quads'],
    how: 'Holding a support, bend one knee and hold the foot behind you. Keep your knees together.',
    dose: `${HOLD} per leg`,
  },

  // Hamstrings
  {
    id: 'hamstrings-foam-roll',
    name: 'Foam roll hamstrings',
    kind: 'self-massage',
    muscles: ['hamstrings'],
    how: 'Sit with a foam roller under the backs of your thighs. Roll slowly from just below the sit bone to above the back of the knee, supporting your weight with your hands.',
    dose: '1 to 2 minutes per leg',
  },
  {
    id: 'hip-hinges',
    name: 'Slow hip hinges',
    kind: 'mobility',
    muscles: ['hamstrings', 'glutes'],
    how: 'Standing with soft knees, push your hips back with a flat back, then stand tall.',
    dose: '8 to 10 slow reps',
  },
  {
    id: 'hamstring-reach',
    name: 'Seated hamstring reach',
    kind: 'stretch',
    muscles: ['hamstrings'],
    how: 'Sit with one leg straight and reach toward your toes with a flat back.',
    dose: `${HOLD} per leg`,
  },

  // Calves
  {
    id: 'calves-foam-roll',
    name: 'Foam roll calves',
    kind: 'self-massage',
    muscles: ['calves'],
    how: 'Sit with a foam roller under your calf and roll slowly from the ankle to just below the knee.',
    dose: '1 to 2 minutes per leg',
  },
  {
    id: 'ankle-circles',
    name: 'Ankle circles',
    kind: 'mobility',
    muscles: ['calves'],
    how: 'Sitting or standing, draw slow circles with each foot in both directions.',
    dose: '10 circles each way per foot',
  },
  {
    id: 'calf-wall-stretch',
    name: 'Wall calf stretch',
    kind: 'stretch',
    muscles: ['calves'],
    how: 'With your hands on a wall and one foot back, keep the heel down and lean in until you feel a mild stretch.',
    dose: `${HOLD} per leg`,
  },

  // Inner thighs
  {
    id: 'adductors-foam-roll',
    name: 'Foam roll inner thighs',
    kind: 'self-massage',
    muscles: ['adductors'],
    how: 'Lie face down with one leg out to the side over a foam roller. Roll slowly with light pressure.',
    dose: '1 minute per leg',
  },
  {
    id: 'frog-rocks',
    name: 'Gentle frog rocks',
    kind: 'mobility',
    muscles: ['adductors'],
    how: 'On hands and knees, widen your knees and rock your hips gently back.',
    dose: '8 to 10 slow rocks',
  },
  {
    id: 'butterfly-stretch',
    name: 'Butterfly stretch',
    kind: 'stretch',
    muscles: ['adductors'],
    how: 'Sit with the soles of your feet together and let your knees drop out to the sides. Sit tall.',
    dose: HOLD,
  },
];
