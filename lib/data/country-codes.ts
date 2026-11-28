export interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const countryCodes: CountryCode[] = [
  // Indonesia
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },

  // Asia Tenggara
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapura', dialCode: '+65', flag: '🇸🇬' },
  { code: 'BN', name: 'Brunei Darussalam', dialCode: '+673', flag: '🇧🇳' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { code: 'PH', name: 'Filipina', dialCode: '+63', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { code: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲' },
  { code: 'KH', name: 'Kamboja', dialCode: '+855', flag: '🇰🇭' },
  { code: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦' },
  { code: 'TL', name: 'Timor Leste', dialCode: '+670', flag: '🇹🇱' },

  // Asia Selatan
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },

  // Asia Timur
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },

  // Timur Tengah & Afrika Utara
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲' },
  { code: 'JO', name: 'Jordan', dialCode: '+962', flag: '🇯🇴' },
  { code: 'YE', name: 'Yemen', dialCode: '+967', flag: '🇾🇪' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },

  // Eropa
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finlandia', dialCode: '+358', flag: '🇫🇮' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },

  // Oseania
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },

  // Amerika
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
];

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  finlandia: 'FI',
  finland: 'FI',
  swedia: 'SE',
  sweden: 'SE',
  norwegia: 'NO',
  norway: 'NO',
  jerman: 'DE',
  germany: 'DE',
  belanda: 'NL',
  netherlands: 'NL',
  prancis: 'FR',
  france: 'FR',
  belgia: 'BE',
  belgium: 'BE',
  swiss: 'CH',
  switzerland: 'CH',
  italia: 'IT',
  italy: 'IT',
  spanyol: 'ES',
  spain: 'ES',
  irlandia: 'IE',
  ireland: 'IE',
  polandia: 'PL',
  poland: 'PL',
  rusia: 'RU',
  russia: 'RU',
  inggris: 'GB',
  'united kingdom': 'GB',
  'arab saudi': 'SA',
  'saudi arabia': 'SA',
  mesir: 'EG',
  egypt: 'EG',
  maroko: 'MA',
  morocco: 'MA',
  turki: 'TR',
  turkey: 'TR',
  yordania: 'JO',
  jordan: 'JO',
  yaman: 'YE',
  yemen: 'YE',
  jepang: 'JP',
  japan: 'JP',
  'korea selatan': 'KR',
  'south korea': 'KR',
  'selandia baru': 'NZ',
  'new zealand': 'NZ',
  'amerika serikat': 'US',
  'united states': 'US',
  kanada: 'CA',
  canada: 'CA',
};

export const getCountryCodeByName = (countryName: string): CountryCode | undefined => {
  const normalized = countryName?.trim().toLowerCase();
  if (!normalized) return undefined;
  const aliasCode = COUNTRY_NAME_ALIASES[normalized];
  if (aliasCode) {
    return countryCodes.find(c => c.code === aliasCode);
  }
  return countryCodes.find(
    country =>
      country.name.toLowerCase() === normalized ||
      country.code.toLowerCase() === normalized
  );
};

export const getCountryCodeByDial = (dialCode: string): CountryCode | undefined => {
  return countryCodes.find(country => country.dialCode === dialCode);
};
