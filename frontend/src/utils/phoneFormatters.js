import { parsePhoneNumberFromString } from "libphonenumber-js";

export const normalizePhoneForStorage = (input) => {
  const phone = parsePhoneNumberFromString(input, "US");
  return phone && phone.isValid() ? phone.number : input;
};

export const formatDisplayPhone = (e164Number) => {
  const phone = parsePhoneNumberFromString(e164Number);
  return phone && phone.isValid() ? phone.formatNational() : e164Number;
};
