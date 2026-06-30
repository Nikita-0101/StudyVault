import { randomInt } from 'node:crypto';

/*
 * Убраны неоднозначные символы:
 *
 * 0 и O
 * 1 и I
 */
const INVITE_CODE_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const DEFAULT_INVITE_CODE_LENGTH = 8;

export const generateInviteCode = (
  length: number =
    DEFAULT_INVITE_CODE_LENGTH,
): string => {
  let inviteCode = '';

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    const randomIndex = randomInt(
      INVITE_CODE_ALPHABET.length,
    );

    inviteCode +=
      INVITE_CODE_ALPHABET[randomIndex];
  }

  return inviteCode;
};