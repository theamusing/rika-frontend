// Source sheets are row-major: front, left, right, back.
export const FOUR_DIRECTION_TURN_ORDER: readonly number[] = [0, 1, 3, 2];

/** Inverse permutation: turn order back into the template's 2x2 grid order. */
export const fourDirectionGridFrames = <T,>(turnFrames: T[]): T[] => {
  if (turnFrames.length !== 4) throw new Error('A four-direction character must contain four frames');
  return FOUR_DIRECTION_TURN_ORDER.map(index => turnFrames[index]);
};

/** Keep deliberate user reordering and added/removed frames in edited copies. */
export const fourDirectionPlaybackOrder = (
  frameCount: number, metadata?: { id?: string }[], source?: string, orderVersion?: number,
): readonly number[] | undefined => {
  if (frameCount !== 4) return undefined;
  if (source === 'generated' || !metadata) return FOUR_DIRECTION_TURN_ORDER;
  if (orderVersion === 1) return undefined;
  // Repair untouched grid-order saves made before turning order was introduced.
  const originalGridOrder = metadata.length === 4 && metadata.every((frame, index) =>
    new RegExp(`^original-.+-${index}$`).test(frame.id || ''));
  return originalGridOrder ? FOUR_DIRECTION_TURN_ORDER : undefined;
};
