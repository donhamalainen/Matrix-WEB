/**
 * Maakohtaiset puhelinkoodit (lyhyt PoC-lista — laajenna vapaasti).
 * Käytetään kirjautumislomakkeen valitsimessa.
 */
export type Country = {
  code: string; // ISO-3166 alpha-2
  name: string;
  dial: string; // E.164-etuliite ilman +
  flag: string;
};

export const COUNTRIES: Country[] = [
  { code: "FI", name: "Suomi", dial: "358", flag: "🇫🇮" },
  { code: "SE", name: "Ruotsi", dial: "46", flag: "🇸🇪" },
  { code: "NO", name: "Norja", dial: "47", flag: "🇳🇴" },
  { code: "DK", name: "Tanska", dial: "45", flag: "🇩🇰" },
  { code: "EE", name: "Viro", dial: "372", flag: "🇪🇪" },
  { code: "DE", name: "Saksa", dial: "49", flag: "🇩🇪" },
  { code: "GB", name: "Iso-Britannia", dial: "44", flag: "🇬🇧" },
  { code: "US", name: "Yhdysvallat", dial: "1", flag: "🇺🇸" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

/**
 * Yhdistää maakoodin ja paikallisen numeron E.164-muotoon.
 * Poistaa johtavat nollat ja muut kuin numerot paikallisesta osasta.
 */
export function toE164(country: Country, localNumber: string): string {
  const digits = localNumber.replace(/\D/g, "").replace(/^0+/, "");
  return `+${country.dial}${digits}`;
}
