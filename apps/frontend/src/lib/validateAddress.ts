/**
 * Shared validation for delivery addresses.
 *
 * The backend marks fullName/phone/line1/city/state/pincode as required, so
 * submitting a partial form used to fail with a raw Mongoose error
 * ("Path `city` is required."). Validating here gives field-level messages
 * before the request is made.
 */

export interface AddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export type AddressErrors = Partial<Record<keyof AddressInput, string>>;

export function validateAddress(a: AddressInput): AddressErrors {
  const e: AddressErrors = {};
  const trim = (v?: string) => (v || '').trim();

  if (!trim(a.fullName)) e.fullName = 'Full name is required.';
  else if (trim(a.fullName).length < 2) e.fullName = 'Enter your full name.';

  const phone = trim(a.phone).replace(/[\s-]/g, '');
  if (!phone) e.phone = 'Phone number is required.';
  else if (!/^(\+91)?[6-9]\d{9}$/.test(phone)) e.phone = 'Enter a valid 10-digit mobile number.';

  if (!trim(a.line1)) e.line1 = 'Address is required.';
  if (!trim(a.city)) e.city = 'City is required.';
  if (!trim(a.state)) e.state = 'State is required.';

  const pin = trim(a.pincode);
  if (!pin) e.pincode = 'Pincode is required.';
  else if (!/^[1-9]\d{5}$/.test(pin)) e.pincode = 'Enter a valid 6-digit pincode.';

  return e;
}

export const hasErrors = (e: AddressErrors) => Object.keys(e).length > 0;
