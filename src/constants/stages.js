export const STAGE_KEYS = Object.freeze({
  PENDING: 'PENDING',
  ATTEMPTED: 'ATTEMPTED',
  ENGAGED: 'ENGAGED',
  CONVERTED: 'CONVERTED',
  PARKED: 'PARKED'
});

export const TERMINAL_STAGE_KEYS = Object.freeze([
  STAGE_KEYS.CONVERTED,
  STAGE_KEYS.PARKED
]);

export const REASON_REQUIRED_STAGE_KEYS = Object.freeze([
  STAGE_KEYS.PARKED
]);

export const isTerminalStage = (stageKey) => {
  return TERMINAL_STAGE_KEYS.includes(String(stageKey || '').trim().toUpperCase());
};

export const isReasonRequiredStage = (stageKey) => {
  return REASON_REQUIRED_STAGE_KEYS.includes(String(stageKey || '').trim().toUpperCase());
};
