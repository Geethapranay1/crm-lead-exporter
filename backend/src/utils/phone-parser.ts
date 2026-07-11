import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export interface ParsedPhone {
  countryCode: string;
  nationalNumber: string;
  isValid: boolean;
  country: string | undefined;
}

export function parsePhone(raw: string, defaultCountry?: CountryCode): ParsedPhone {
  const cleaned = raw.replace(/[\s\-().]/g, "");

  if (cleaned.startsWith("+")) {
    const phone = parsePhoneNumberFromString(cleaned);
    if (phone?.isValid()) {
      return {
        countryCode: `+${phone.countryCallingCode}`,
        nationalNumber: phone.nationalNumber,
        isValid: true,
        country: phone.country,
      };
    }
  }

  if (defaultCountry) {
    const phone = parsePhoneNumberFromString(cleaned, defaultCountry);
    if (phone?.isValid()) {
      return {
        countryCode: `+${phone.countryCallingCode}`,
        nationalNumber: phone.nationalNumber,
        isValid: true,
        country: phone.country,
      };
    }
  }

  const commonCountries: CountryCode[] = ["IN", "US", "AE", "GB", "SG", "AU", "SA"];
  for (const cc of commonCountries) {
    const phone = parsePhoneNumberFromString(cleaned, cc);
    if (phone?.isValid()) {
      return {
        countryCode: `+${phone.countryCallingCode}`,
        nationalNumber: phone.nationalNumber,
        isValid: true,
        country: phone.country,
      };
    }
  }

  const digits = cleaned.replace(/\D/g, "");
  return {
    countryCode: "",
    nationalNumber: digits,
    isValid: false,
    country: undefined,
  };
}

export function inferDefaultCountry(record: { country?: string; state?: string; city?: string }): CountryCode | undefined {
  const countryMap: Record<string, CountryCode> = {
    "india": "IN", "bharat": "IN",
    "united states": "US", "usa": "US", "us": "US", "america": "US",
    "united arab emirates": "AE", "uae": "AE", "dubai": "AE",
    "united kingdom": "GB", "uk": "GB", "england": "GB",
    "singapore": "SG",
    "australia": "AU",
    "saudi arabia": "SA", "ksa": "SA",
  };

  const countryLower = (record.country || "").toLowerCase().trim();
  if (countryMap[countryLower]) return countryMap[countryLower];

  const stateLower = (record.state || "").toLowerCase().trim();
  const indianStates = ["maharashtra", "karnataka", "delhi", "tamil nadu", "telangana", "gujarat", "rajasthan", "kerala", "andhra pradesh", "madhya pradesh", "uttar pradesh", "west bengal", "punjab", "haryana", "bihar"];
  if (indianStates.includes(stateLower)) return "IN";

  return undefined;
}
