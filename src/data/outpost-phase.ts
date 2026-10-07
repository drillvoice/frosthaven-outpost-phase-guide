import type { FlagDef, PhaseDef } from './types';

// ---------------------------------------------------------------------------
// Outpost Phase steps (rulebook pp. 59–68).
//
// This is the only file you need to edit to change steps, reminders or
// toggles. Reminders are paraphrased — keep them short, and refer to
// page / card / section numbers rather than copying card text.
//
// To add a step unlocked later by a rulebook sticker, add an entry to the
// relevant phase's `steps` array. Give it a new unique `id`.
// ---------------------------------------------------------------------------

export const flags: FlagDef[] = [
  // Passage of Time
  { id: 'winter', scope: 'campaign', label: 'Season', choices: ['Summer', 'Winter'] },

  // Outpost Event
  { id: 'skipEvent', scope: 'phase', label: 'We were told not to resolve an outpost event this week' },
  { id: 'attack', scope: 'phase', label: 'The event card has an attack on its back', showWhen: { none: ['skipEvent'] } },
  { id: 'barracksWrecked', scope: 'campaign', label: 'The Barracks is wrecked', showWhen: { all: ['attack'], none: ['skipEvent'] } },

  // Downtime (per character unless noted)
  { id: 'levelUpDue', scope: 'character', label: 'XP has reached the next level' },
  { id: 'belowHalfProsperity', scope: 'character', label: 'Level is below half prosperity (rounded up)' },
  { id: 'retiring', scope: 'character', label: 'Personal quest is complete (must retire)' },
  { id: 'firstClassRetirement', scope: 'character', label: 'First character of this class to retire', showWhen: { all: ['retiring'] } },
  { id: 'newCharacter', scope: 'character', label: 'Player is starting a new character' },
  { id: 'building37', scope: 'campaign', label: 'Building 37 has been built (party-wide)' },

  // Construction
  { id: 'building', scope: 'phase', label: 'We are building or upgrading this week' },
  { id: 'secondBuild', scope: 'phase', label: 'Losing 2 morale for a second build/upgrade', showWhen: { all: ['building'] } },
  { id: 'prosperityRose', scope: 'phase', label: 'A build/upgrade raised the prosperity level', showWhen: { all: ['building'] } },
  { id: 'anyWrecked', scope: 'campaign', label: 'One or more buildings are wrecked' },
];

export const phases: PhaseDef[] = [
  {
    id: 'time',
    title: 'Passage of Time',
    pages: '59',
    flags: [],
    steps: [
      {
        id: 'time.mark',
        title: 'Mark the next calendar box and read any sections in it',
        reminder:
          'Cross off the next empty box on the campaign sheet calendar (one box = one week). If it holds section numbers, read each one from the section book, one at a time, in any order.',
      },
      {
        id: 'time.season',
        title: 'Check the season',
        asks: ['winter'],
        reminder:
          'If the box you marked completed a set of 10, the season flips. Set the selector to match the calendar: it decides which outpost event deck you draw from.',
      },
    ],
  },
  {
    id: 'event',
    title: 'Outpost Event',
    pages: '60–61',
    flags: ['skipEvent'],
    steps: [
      {
        id: 'event.skipped',
        title: 'No outpost event this week',
        when: { all: ['skipEvent'] },
        reminder: 'A section or card said to skip this week\'s outpost event. Nothing to draw; move on to Building Operations.',
      },
      {
        id: 'event.drawSummer',
        title: 'Draw a summer outpost event',
        when: { none: ['skipEvent', 'winter'] },
        reminder: 'Top card of the summer outpost event deck (season set in Passage of Time).',
      },
      {
        id: 'event.drawWinter',
        title: 'Draw a winter outpost event',
        when: { all: ['winter'], none: ['skipEvent'] },
        reminder: 'Top card of the winter outpost event deck. Attacks are much more common in winter.',
      },
      {
        id: 'event.resolve',
        title: 'Choose an option and resolve it',
        when: { none: ['skipEvent'] },
        reminder:
          'Read the front, agree on an option, then apply only that outcome from the back. Same as road events (p. 12). Follow the card\'s instructions for what to do with it afterwards.',
      },
      {
        id: 'event.attackCheck',
        title: 'Check the back for an attack',
        when: { none: ['skipEvent'] },
        asks: ['attack'],
        reminder: 'An attack is printed below the outcomes on the back of the card. If there is one, switch on the toggle below.',
      },
      {
        id: 'event.attack.read',
        group: 'Attack',
        title: 'Note attack value, targets and priority',
        when: { all: ['attack'], none: ['skipEvent'] },
        asks: ['barracksWrecked'],
        reminder:
          'Attack value = what each defense check must meet or beat. The target number = how many buildings get hit. Priority = which non-wrecked buildings, in order; the party picks if none is given. A building can only be hit once.',
      },
      {
        id: 'event.attack.defense',
        group: 'Attack',
        title: 'Work out Frosthaven\'s total defense',
        when: { all: ['attack'], none: ['skipEvent'] },
        reminder: 'Take the total defense from the campaign sheet and add any modifier from the event outcome.',
      },
      {
        id: 'event.attack.noBarracks',
        group: 'Attack',
        title: 'Barracks wrecked: every check has disadvantage',
        when: { all: ['attack', 'barracksWrecked'], none: ['skipEvent'] },
        reminder: 'No spending soldiers for advantage while the Barracks is wrecked. Draw two town guard cards and use the worse one.',
      },
      {
        id: 'event.attack.checks',
        group: 'Attack',
        title: 'Defense check for each targeted building',
        when: { all: ['attack'], none: ['skipEvent'] },
        reminder:
          'Per building: optionally lose soldiers first (Barracks intact) for advantage and a lower attack value, scaled by Barracks level. Draw a town guard card and add it to defense. "Success"/"wrecked" cards decide it automatically. Reshuffle if the deck runs out.',
      },
      {
        id: 'event.attack.damage',
        group: 'Attack',
        title: 'Damaged → pay now; wrecked → flip',
        when: { all: ['attack'], none: ['skipEvent'] },
        reminder:
          'As each check fails: a damaged building\'s repair cost is paid immediately (any materials, town or personal supply), or lose 1 morale instead. A wrecked building flips to its wrecked side.',
      },
      {
        id: 'event.attack.after',
        group: 'Attack',
        title: 'After the last check: resolve damage/wreck effects',
        when: { all: ['attack'], none: ['skipEvent'] },
        reminder:
          'Only once the whole attack is done, resolve any effects of buildings having been damaged or wrecked. If anything was wrecked, turn on "buildings are wrecked" in Construction.',
      },
      {
        id: 'event.attack.reshuffle',
        group: 'Attack',
        title: 'Reshuffle the town guard deck',
        when: { all: ['attack'], none: ['skipEvent'] },
        reminder: 'Shuffle all town guard cards back into one deck.',
      },
    ],
  },
  {
    id: 'operations',
    title: 'Building Operations',
    pages: '62',
    flags: [],
    steps: [
      {
        id: 'ops.resolve',
        title: 'Resolve each building\'s ☀ effect in number order',
        reminder:
          'Go through the building deck from the lowest number up, applying the ☀ effect at the top of each card. Wrecked buildings use their wrecked-side effect, including ones wrecked this week.',
      },
      {
        id: 'ops.optional',
        title: 'Decide on optional building effects',
        optional: true,
        reminder:
          'Some effects give a benefit only if the full cost is paid. Gains and losses can use the town or any personal supply. If you can\'t cover a loss, pay what you can; there\'s no extra penalty.',
      },
    ],
  },
  {
    id: 'downtime',
    title: 'Downtime',
    pages: '62–67',
    flags: ['building37'],
    steps: [
      {
        id: 'downtime.review',
        perCharacter: true,
        title: 'Check what applies to this character',
        asks: ['levelUpDue', 'belowHalfProsperity', 'retiring', 'firstClassRetirement', 'newCharacter'],
        reminder:
          'Compare XP with the next level, level with half prosperity (rounded up), and check the personal quest. Downtime can be done in any order; this list is just a sensible one.',
      },
      {
        id: 'downtime.levelUp',
        perCharacter: true,
        title: 'Level up (required)',
        when: { all: ['levelUpDue'] },
        reminder:
          'XP is not spent. Add one ability card of the new level or lower to the pool, raise max HP to the red number on the mat\'s level track, gain a perk mark and choose a perk (p. 63).',
      },
      {
        id: 'downtime.catchUp',
        perCharacter: true,
        optional: true,
        title: 'Catch-up level up',
        when: { all: ['belowHalfProsperity'] },
        reminder:
          'May level up without the XP, repeatedly, up to half prosperity (rounded up). Set XP to the new level\'s minimum. Normal level-up benefits apply.',
      },
      {
        id: 'downtime.craft',
        perCharacter: true,
        optional: true,
        title: 'Craft items (Craftsman)',
        reminder:
          'Pay the item\'s recipe. Materials must come from your own supply, but herbs can come from the town supply. Not possible if the Craftsman is wrecked (p. 65).',
      },
      {
        id: 'downtime.brew',
        perCharacter: true,
        optional: true,
        title: 'Brew potions (Alchemist)',
        reminder:
          'Spend 2 herbs from any supply and look up the pair on the alchemy chart. Tear open the window the first time. Level 2 adds distilling; level 3 allows 3-herb brews. Not if wrecked (p. 66).',
      },
      {
        id: 'downtime.sell',
        perCharacter: true,
        optional: true,
        title: 'Sell items',
        reminder:
          'Purchasable items: half their gold cost, rounded down. Craftable items: 2 gold per resource/item in the recipe. Duplicates must be sold. Return sold items to the supply (p. 67).',
      },
      {
        id: 'downtime.purchase',
        perCharacter: true,
        optional: true,
        title: 'Purchase items',
        when: { all: ['building37'] },
        reminder: 'Open buying is available now that building 37 is built. Follow the sticker covering "Purchase Items" on p. 67.',
      },
      {
        id: 'downtime.retire',
        perCharacter: true,
        title: 'Retire (required)',
        when: { all: ['retiring'] },
        reminder:
          'Do this character\'s other downtime first. Party gains 2 prosperity and unlocks the quest\'s envelope (alternate if taken; random scenario + item blueprint if both are). Optionally spend 15 inspiration for a second quest (p. 64).',
      },
      {
        id: 'downtime.retireSection',
        perCharacter: true,
        title: 'Read the class retirement section',
        when: { all: ['retiring', 'firstClassRetirement'] },
        reminder: 'First retirement of this class: flip the character mat and read the section number near the bottom, after the quest rewards.',
      },
      {
        id: 'downtime.retireCleanup',
        perCharacter: true,
        title: 'Record and pack away the retired character',
        when: { all: ['retiring'] },
        reminder:
          'Add them to the retirement table on the campaign sheet. Items go back to the supply, resources to the town supply, gold is lost. Their quest card(s) leave the game.',
      },
      {
        id: 'downtime.create',
        perCharacter: true,
        title: 'Create the new character',
        when: { all: ['newCharacter'] },
        reminder:
          'Any class with no active character. Draw 2 personal quests, keep 1. Gold = 10 × prosperity + 20, spent now (leftover lost). Perk marks = this player\'s past retirements. Catch-up level up. Update the party tab (p. 65).',
      },
    ],
  },
  {
    id: 'construction',
    title: 'Construction',
    pages: '68',
    flags: [],
    steps: [
      {
        id: 'build.decide',
        title: 'Decide what to build, upgrade and rebuild',
        asks: ['building', 'secondBuild', 'anyWrecked'],
        reminder:
          'One build or upgrade by default; a second costs 2 morale. Rebuilds are unlimited but come after builds/upgrades.',
      },
      {
        id: 'build.pay',
        title: 'Pay for the build/upgrade',
        when: { all: ['building'] },
        reminder:
          'Town supply only. Prosperity must meet the requirement shown next to the cost (map board for builds, building card for upgrades). Wrecked buildings can\'t be upgraded.',
      },
      {
        id: 'build.second',
        title: 'Second build/upgrade: lose 2 morale',
        when: { all: ['building', 'secondBuild'] },
        reminder: 'Same cost and prosperity rules as the first one.',
      },
      {
        id: 'build.apply',
        title: 'Place stickers, update the building deck',
        when: { all: ['building'] },
        asks: ['prosperityRose'],
        reminder:
          'Build: cover the cost with the level 1 sticker and add its card to the deck in number order. Upgrade: sticker over the old one and swap the card. Gain prosperity and apply any one-time effects.',
      },
      {
        id: 'build.catchUp',
        title: 'Catch-up level ups after prosperity rose',
        optional: true,
        when: { all: ['building', 'prosperityRose'] },
        reminder:
          'Anyone whose level is now below half the new prosperity (rounded up) may level up for free, up to that cap. Set XP to the new level\'s minimum.',
      },
      {
        id: 'build.rebuild',
        title: 'Rebuild wrecked buildings',
        optional: true,
        when: { all: ['anyWrecked'] },
        reminder:
          'Any number, after builds/upgrades. Pay the cost on the wrecked side from the town supply and flip the card back. Switch off "buildings are wrecked" once none remain.',
      },
    ],
  },
];
