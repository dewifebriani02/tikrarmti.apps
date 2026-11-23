/**
 * Formats personal names into clean Proper Case (Title Case) while preserving
 * Indonesian/Islamic/academic/professional titles & degrees ("gelar").
 *
 * Examples:
 *  - "Zuriati usman"              -> "Zuriati Usman"
 *  - "MUKTI HARTINI"              -> "Mukti Hartini"
 *  - "syifa fauziyah"             -> "Syifa Fauziyah"
 *  - "musri'ah"                   -> "Musri'ah"
 *  - "Lantika Simanullang, SH.I"  -> "Lantika Simanullang, SH.I"
 *  - "Lantika Simanulang, S.H.I"  -> "Lantika Simanulang, S.H.I"
 *  - "Mista,S.Si"                 -> "Mista, S.Si"
 *  - "Sri Mulyani.ST"             -> "Sri Mulyani.ST"
 *  - "dr. rina susanti, sp.a"     -> "dr. Rina Susanti, Sp.A"
 *  - "HJ. SITI AMINAH, S.PD.I"    -> "Hj. Siti Aminah, S.Pd.I"
 *  - "aisyah binti abdullah"      -> "Aisyah binti Abdullah"
 *  - "A.ritawati"                 -> "A.Ritawati"
 *  - "h.m. ahmad"                 -> "H.M. Ahmad"
 */

/**
 * Canonical casing for dotted academic/professional/honorific titles (keyed without trailing dot, lowercase).
 */
const DOTTED_TITLE_MAP: Record<string, string> = {
  // Prefix / honorific titles
  prof: 'Prof',
  ir: 'Ir',
  drs: 'Drs',
  dra: 'Dra',
  hj: 'Hj',
  kh: 'KH',
  'k.h': 'K.H',
  ust: 'Ust',
  ustzh: 'Ustzh',
  ns: 'Ns',
  gr: 'Gr',
  bd: 'Bd',
  bdn: 'Bdn',
  tgk: 'Tgk',
  'r.a': 'R.A',
  rr: 'Rr',
  tb: 'Tb',
  ny: 'Ny',
  lc: 'Lc',

  // Diploma (A.Md / A.Ma)
  'a.md': 'A.Md',
  'a.md.keb': 'A.Md.Keb',
  'a.md.kep': 'A.Md.Kep',
  'a.md.farm': 'A.Md.Farm',
  'a.md.gz': 'A.Md.Gz',
  'a.md.ak': 'A.Md.Ak',
  'a.md.kom': 'A.Md.Kom',
  'a.md.t': 'A.Md.T',
  'a.md.kes': 'A.Md.Kes',
  'a.md.par': 'A.Md.Par',
  'a.md.rmik': 'A.Md.RMIK',
  'a.md.rad': 'A.Md.Rad',
  'a.md.ft': 'A.Md.Ft',
  'a.md.kl': 'A.Md.KL',
  'a.md.ab': 'A.Md.AB',
  'a.md.si': 'A.Md.Si',
  'a.ma': 'A.Ma',
  'a.ma.pd': 'A.Ma.Pd',
  'a.ma.pust': 'A.Ma.Pust',

  // Sarjana (S1 / D4)
  's.pd': 'S.Pd',
  's.pdi': 'S.PdI',
  's.pd.i': 'S.Pd.I',
  's.pd.sd': 'S.Pd.SD',
  's.pd.aud': 'S.Pd.AUD',
  's.si': 'S.Si',
  's.kom': 'S.Kom',
  's.kom.i': 'S.Kom.I',
  's.ag': 'S.Ag',
  's.th.i': 'S.Th.I',
  's.ud': 'S.Ud',
  's.sy': 'S.Sy',
  's.fil.i': 'S.Fil.I',
  's.e': 'S.E',
  's.e.i': 'S.E.I',
  's.e.sy': 'S.E.Sy',
  's.ak': 'S.Ak',
  's.ab': 'S.AB',
  's.ap': 'S.AP',
  's.m': 'S.M',
  's.h': 'S.H',
  's.hi': 'S.HI',
  's.h.i': 'S.H.I',
  'sh.i': 'SH.I',
  's.t': 'S.T',
  's.tp': 'S.TP',
  's.pt': 'S.Pt',
  's.pi': 'S.Pi',
  's.p': 'S.P',
  's.hut': 'S.Hut',
  's.ars': 'S.Ars',
  's.ds': 'S.Ds',
  's.sn': 'S.Sn',
  's.s': 'S.S',
  's.hum': 'S.Hum',
  's.sos': 'S.Sos',
  's.sos.i': 'S.Sos.I',
  's.ip': 'S.IP',
  's.i.p': 'S.I.P',
  's.i.kom': 'S.I.Kom',
  's.ik': 'S.IK',
  's.psi': 'S.Psi',
  's.stat': 'S.Stat',
  's.mat': 'S.Mat',
  's.geo': 'S.Geo',
  's.or': 'S.Or',
  's.km': 'S.KM',
  's.k.m': 'S.K.M',
  's.kep': 'S.Kep',
  's.keb': 'S.Keb',
  's.ked': 'S.Ked',
  's.kg': 'S.KG',
  's.kh': 'S.KH',
  's.gz': 'S.Gz',
  's.farm': 'S.Farm',
  's.tr.keb': 'S.Tr.Keb',
  's.tr.kep': 'S.Tr.Kep',
  's.tr.gz': 'S.Tr.Gz',
  's.tr.ak': 'S.Tr.Ak',
  's.tr.kom': 'S.Tr.Kom',
  's.tr.t': 'S.Tr.T',
  's.tr.kes': 'S.Tr.Kes',
  's.tr.par': 'S.Tr.Par',

  // Magister (S2)
  'm.pd': 'M.Pd',
  'm.pdi': 'M.PdI',
  'm.pd.i': 'M.Pd.I',
  'm.si': 'M.Si',
  'm.sc': 'M.Sc',
  'm.kom': 'M.Kom',
  'm.ag': 'M.Ag',
  'm.kes': 'M.Kes',
  'm.km': 'M.KM',
  'm.k.m': 'M.K.M',
  'm.kep': 'M.Kep',
  'm.keb': 'M.Keb',
  'm.farm': 'M.Farm',
  'm.gz': 'M.Gz',
  'm.psi': 'M.Psi',
  'm.hum': 'M.Hum',
  'm.sos': 'M.Sos',
  'm.h': 'M.H',
  'm.h.i': 'M.H.I',
  'm.kn': 'M.Kn',
  'm.m': 'M.M',
  'm.e': 'M.E',
  'm.e.i': 'M.E.I',
  'm.e.sy': 'M.E.Sy',
  'm.ak': 'M.Ak',
  'm.t': 'M.T',
  'm.eng': 'M.Eng',
  'm.ed': 'M.Ed',
  'm.a': 'M.A',
  'm.b.a': 'M.B.A',
  'm.p': 'M.P',
  'm.pt': 'M.Pt',
  'm.pi': 'M.Pi',
  'm.ars': 'M.Ars',
  'm.stat': 'M.Stat',
  'm.phil': 'M.Phil',
  'm.tr.keb': 'M.Tr.Keb',

  // Doktor / International
  'ph.d': 'Ph.D',
  'd.phil': 'D.Phil',
  'ed.d': 'Ed.D',
  'b.a': 'B.A',
  'b.sc': 'B.Sc',
  'b.eng': 'B.Eng',
  'b.ed': 'B.Ed',
  'll.b': 'LL.B',
  'll.m': 'LL.M',

  // Spesialis medis
  'sp.a': 'Sp.A',
  'sp.og': 'Sp.OG',
  'sp.pd': 'Sp.PD',
  'sp.b': 'Sp.B',
  'sp.m': 'Sp.M',
  'sp.kk': 'Sp.KK',
  'sp.dve': 'Sp.DVE',
  'sp.tht': 'Sp.THT',
  'sp.jp': 'Sp.JP',
  'sp.p': 'Sp.P',
  'sp.s': 'Sp.S',
  'sp.n': 'Sp.N',
  'sp.kj': 'Sp.KJ',
  'sp.an': 'Sp.An',
  'sp.rad': 'Sp.Rad',
  'sp.pk': 'Sp.PK',
  'sp.pa': 'Sp.PA',
  'sp.gk': 'Sp.GK',
  'sp.ok': 'Sp.OK',
  'sp.kfr': 'Sp.KFR',
  'sp.ort': 'Sp.Ort',
  'sp.kg': 'Sp.KG',
  'sp.bm': 'Sp.BM',
};

/**
 * Unambiguous non-dotted degree abbreviations (3+ letters or widely used suffix codes).
 */
const UNAMBIGUOUS_SUFFIX_DEGREES: Record<string, string> = {
  skm: 'SKM',
  mba: 'MBA',
  msc: 'MSc',
  phd: 'PhD',
  cpa: 'CPA',
  bkp: 'BKP',
  mkn: 'MKn',
  mars: 'MARS',
  mkm: 'MKM',
  spd: 'SPd',
  spdi: 'SPdI',
  ssi: 'SSi',
  skom: 'SKom',
  sag: 'SAg',
  spsi: 'SPsi',
  ssos: 'SSos',
  shi: 'SHI',
  sei: 'SEI',
  skep: 'SKep',
  sked: 'SKed',
  sgz: 'SGz',
  sfarm: 'SFarm',
  amd: 'AMd',
  amdkeb: 'AMdKeb',
  amdkep: 'AMdKep',
  mpd: 'MPd',
  mpdi: 'MPdI',
  msi: 'MSi',
  mkes: 'MKes',
  mag: 'MAg',
  mkom: 'MKom',
  mpsi: 'MPsi',
  mhum: 'MHum',
  lc: 'Lc',
  cht: 'CHt',
  psikolog: 'Psikolog',
};

/**
 * Short 2-3 letter non-dotted suffix degrees — applied when after a comma, dot-attached,
 * or explicitly typed in uppercase (to avoid turning short name words into ALL CAPS).
 */
const SHORT_SUFFIX_DEGREES: Record<string, string> = {
  se: 'SE',
  sh: 'SH',
  st: 'ST',
  ss: 'SS',
  mm: 'MM',
  ma: 'MA',
  me: 'ME',
  mh: 'MH',
  mt: 'MT',
  ms: 'MS',
  mp: 'MP',
  sp: 'SP',
  ak: 'Ak',
  ca: 'CA',
  ns: 'Ns',
  gr: 'Gr',
  apt: 'Apt',
};

/**
 * Lowercase particles in Indonesian/Islamic names (when not at start of name).
 */
const LOWERCASE_PARTICLES = new Set(['bin', 'binti', 'bt', 'bt.']);

const PREFIX_DOT_TITLES = new Set([
  'dr', 'drg', 'apt', 'hj', 'prof', 'ir', 'drs', 'dra', 'kh', 'ust', 'ustzh', 'ns', 'st',
]);

/**
 * Special lowercase-sensitive medical/professional prefix titles per Indonesian EYD.
 * e.g. "dr." (dokter medis) stays lowercase if written lowercase, while "Dr." (Doktor) stays capitalized.
 */
function formatEydCaseSensitiveTitle(core: string, trailingDot: string): string | null {
  const lower = core.toLowerCase();
  if (lower === 'dr') {
    if (core === 'dr') return `dr${trailingDot}`;
    return `Dr${trailingDot}`;
  }
  if (lower === 'drg') {
    if (core === 'drg') return `drg${trailingDot}`;
    if (core === 'DRG') return `drg${trailingDot}`;
    return `${core}${trailingDot}`;
  }
  if (lower === 'apt') {
    if (core === 'apt') return `apt${trailingDot}`;
    return `Apt${trailingDot}`;
  }
  return null;
}

function isMixedCase(str: string): boolean {
  const letters = str.replace(/[^a-zA-Z\u00C0-\u024F]/g, '');
  if (letters.length < 2) return false;
  return letters !== letters.toLowerCase() && letters !== letters.toUpperCase();
}

function capitalizeWordPart(word: string): string {
  if (!word) return word;
  // Capitalize first alphabetic character, lowercase the rest.
  // Preserves apostrophes inside names cleanly: "musri'ah" -> "Musri'ah", "a'isyah" -> "A'isyah".
  const lower = word.toLowerCase();
  return lower.replace(/[a-z\u00C0-\u024F]/, (ch) => ch.toUpperCase());
}

function capitalizeHyphenated(word: string): string {
  if (!word.includes('-')) return capitalizeWordPart(word);
  return word
    .split('-')
    .map((part) => capitalizeWordPart(part))
    .join('-');
}

function formatSingleToken(
  rawToken: string,
  options: { tokenIndex: number; afterComma: boolean }
): string {
  if (!rawToken) return rawToken;

  // Separate wrapping parentheses & trailing comma/punctuation
  const match = rawToken.match(/^(\(*)(.+?)(\)*,?)$/);
  if (!match) return rawToken;

  const [, leadPunct, body, trailPunct] = match;
  const trailingDot = body.endsWith('.') ? '.' : '';
  const coreNoTrailDot = trailingDot ? body.slice(0, -1) : body;
  const lowerCore = coreNoTrailDot.toLowerCase();

  // 1. Lowercase connectors ("bin", "binti", "bt", "bt.") when not first word and not after comma
  if (
    options.tokenIndex > 0 &&
    !options.afterComma &&
    LOWERCASE_PARTICLES.has(body.toLowerCase())
  ) {
    return `${leadPunct}${body.toLowerCase()}${trailPunct}`;
  }

  // 2. EYD case-sensitive titles ("dr.", "Dr.", "drg.", "apt.")
  if (
    (lowerCore === 'dr' || lowerCore === 'drg' || lowerCore === 'apt') &&
    (trailingDot === '.' || options.tokenIndex === 0 || options.afterComma)
  ) {
    const formatted = formatEydCaseSensitiveTitle(coreNoTrailDot, trailingDot);
    if (formatted) return `${leadPunct}${formatted}${trailPunct}`;
  }

  // 3. Exact dotted/known title match (e.g. "S.Pd.I", "SH.I", "A.Md.Keb", "Hj.", "Prof.", "Lc.")
  if (DOTTED_TITLE_MAP[lowerCore]) {
    const hasInternalDot = lowerCore.includes('.');
    const isShortPrefixOnly = !hasInternalDot && lowerCore.length <= 4;
    if (
      hasInternalDot ||
      trailingDot === '.' ||
      !isShortPrefixOnly ||
      options.tokenIndex === 0 ||
      options.afterComma
    ) {
      return `${leadPunct}${DOTTED_TITLE_MAP[lowerCore]}${trailingDot}${trailPunct}`;
    }
  }

  // 4. Tokens with internal dots (e.g. "Mulyani.ST", "A.Ritawati", "dr.rina", "H.M.", "S.Tr.Rad")
  if (coreNoTrailDot.includes('.')) {
    const dotIdx = coreNoTrailDot.indexOf('.');
    const leftPart = coreNoTrailDot.slice(0, dotIdx);
    const rightPart = coreNoTrailDot.slice(dotIdx + 1);
    const leftLower = leftPart.toLowerCase();
    const rightLower = rightPart.toLowerCase();

    // Prefix title glued to name without space: e.g. "dr.rina" -> "dr. Rina", "Hj.siti" -> "Hj. Siti"
    if (PREFIX_DOT_TITLES.has(leftLower) && rightPart.length >= 2 && !rightPart.includes('.')) {
      const eyd = formatEydCaseSensitiveTitle(leftPart, '.');
      const prefixFormatted =
        eyd || (DOTTED_TITLE_MAP[leftLower] ? `${DOTTED_TITLE_MAP[leftLower]}.` : `${capitalizeWordPart(leftPart)}.`);
      return `${leadPunct}${prefixFormatted} ${capitalizeHyphenated(rightPart)}${trailingDot}${trailPunct}`;
    }

    // Name glued to degree without comma/space: e.g. "Mulyani.ST", "Mulyani.S.Pd"
    if (leftPart.length >= 3) {
      const rightDegree =
        DOTTED_TITLE_MAP[rightLower] ||
        UNAMBIGUOUS_SUFFIX_DEGREES[rightLower] ||
        SHORT_SUFFIX_DEGREES[rightLower];
      if (rightDegree) {
        return `${leadPunct}${capitalizeHyphenated(leftPart)}.${rightDegree}${trailingDot}${trailPunct}`;
      }
    }

    // Initial attached to name: "A.Ritawati" or "a.ritawati"
    if (leftPart.length === 1 && rightPart.length >= 3 && !rightPart.includes('.')) {
      return `${leadPunct}${leftPart.toUpperCase()}.${capitalizeHyphenated(rightPart)}${trailingDot}${trailPunct}`;
    }

    // Unknown dotted academic/professional degree with deliberate mixed case (e.g. "S.Tr.Rad", "Sp.PD-KGEH")
    if (isMixedCase(coreNoTrailDot)) {
      return `${leadPunct}${body}${trailPunct}`;
    }

    // Multi-initial abbreviations or dotted words (e.g. "h.m." -> "H.M.")
    const dotSegments = coreNoTrailDot
      .split('.')
      .map((seg) => capitalizeHyphenated(seg))
      .join('.');
    return `${leadPunct}${dotSegments}${trailingDot}${trailPunct}`;
  }

  // 5. Suffix degrees (after first word or after comma)
  if (options.tokenIndex > 0 || options.afterComma) {
    // Unambiguous degree abbreviations (SKM, MBA, SPd, AMdKeb, Lc, etc.)
    if (UNAMBIGUOUS_SUFFIX_DEGREES[lowerCore]) {
      if (
        lowerCore.length >= 3 ||
        options.afterComma ||
        trailingDot === '.' ||
        coreNoTrailDot === coreNoTrailDot.toUpperCase()
      ) {
        return `${leadPunct}${UNAMBIGUOUS_SUFFIX_DEGREES[lowerCore]}${trailingDot}${trailPunct}`;
      }
    }

    // Short 2-3 letter suffix degrees (SE, SH, ST, MM, MA, MH, MT, SS, etc.)
    if (SHORT_SUFFIX_DEGREES[lowerCore]) {
      const isExplicitUpper =
        coreNoTrailDot.length >= 2 && coreNoTrailDot === coreNoTrailDot.toUpperCase();
      if (options.afterComma || isExplicitUpper) {
        return `${leadPunct}${SHORT_SUFFIX_DEGREES[lowerCore]}${trailingDot}${trailPunct}`;
      }
    }

    // Unknown custom degree after a comma that already has intentional mixed case (e.g. ", M.Tr.Obs", ", CHt")
    if (options.afterComma && isMixedCase(coreNoTrailDot)) {
      return `${leadPunct}${body}${trailPunct}`;
    }
  }

  // 6. Standard name token: Proper Case (supports hyphens & apostrophes)
  return `${leadPunct}${capitalizeHyphenated(coreNoTrailDot)}${trailingDot}${trailPunct}`;
}

/**
 * Formats a full name / kunyah into clean Proper Case while keeping titles & degrees intact.
 */
export function formatProperName(input: string | null | undefined): string {
  if (!input) return '';

  // Normalize whitespace and ensure clean spacing after commas (e.g. "Mista,S.Si" -> "Mista, S.Si")
  const normalized = input
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  if (!normalized) return '';

  // Split by comma clauses so we know when we are inside a post-comma degree section
  const commaParts = normalized.split(', ');
  let globalTokenIndex = 0;

  const formattedParts = commaParts.map((part, partIdx) => {
    const afterComma = partIdx > 0;
    const tokens = part.split(' ').filter(Boolean);
    const formattedTokens = tokens.map((token) => {
      const res = formatSingleToken(token, {
        tokenIndex: globalTokenIndex,
        afterComma,
      });
      globalTokenIndex += 1;
      return res;
    });
    return formattedTokens.join(' ');
  });

  return formattedParts.join(', ');
}
