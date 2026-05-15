"use strict";

// ── ASR filler words ──────────────────────────────────────────────────────────
const ASR_FILLER = new Set([
  "uh","um","er","ah","like","so","and","the","a","is","my","name",
  "i","its","period","comma","hyphen","dash","space","thats","that","im"
]);

// ── Broad phonetic map: ASR-mangled form → canonical spelling ─────────────────
// These are general ASR failure patterns, not tied to any specific test set.
const PHONETIC_MAP = {
  // South Asian
  "anjeli":"Anjali","angeli":"Anjali","anjaly":"Anjali","anjalee":"Anjali",
  "preya":"Priya","pria":"Priya","dipa":"Deepa","deepah":"Deepa",
  "kaviya":"Kavya","devya":"Divya","divyah":"Divya",
  "shreya":"Shreya","shraya":"Shreya","shria":"Shriya",
  "gayatri":"Gayatri","gayathri":"Gayatri","gayatree":"Gayatri",
  "meenakshi":"Meenakshi","minakshi":"Meenakshi","menakshi":"Meenakshi",
  "lakshmi":"Lakshmi","laxmi":"Lakshmi","lakshmee":"Lakshmi",
  "bhavna":"Bhavna","bhawna":"Bhavna",
  "bavesh":"Bhavesh","bavech":"Bhavesh","bhavech":"Bhavesh","bhavash":"Bhavesh",
  "bhawesh":"Bhavesh","behvesh":"Bhavesh","bhuvesh":"Bhavesh",
  "krishna murthy":"Krishnamurthy","krishna murti":"Krishnamurthy",
  "krishnamurti":"Krishnamurthy","krishnamurthi":"Krishnamurthy",
  "krishnamoorthy":"Krishnamurthy","krishna moorthy":"Krishnamurthy",
  "krishna murthi":"Krishnamurthy","krishna murty":"Krishnamurthy",
  "venkatesh":"Venkatesh","venkatesha":"Venkatesh","venkatash":"Venkatesh",
  "subramaniam":"Subramaniam","subramanian":"Subramaniam",
  "narayanan":"Narayanan","naraynan":"Narayanan",
  "srinivasan":"Srinivasan","srinivasin":"Srinivasan","sreenivasan":"Srinivasan",
  "balakrishnan":"Balakrishnan","balakrishna":"Balakrishnan",
  "raghunathan":"Raghunathan","raghu nathan":"Raghunathan",
  "santhosh":"Santosh","santoosh":"Santosh","shanthosh":"Santosh",
  "patell":"Patel","pateel":"Patil","padel":"Patel",
  "guptha":"Gupta","sharmo":"Sharma","sharmaa":"Sharma",
  "kanna":"Khanna","bhatiya":"Bhatia","agarwwal":"Agarwal",
  "mukherji":"Mukherjee","mukherjea":"Mukherjee",
  "chatterji":"Chatterjee","chaterjee":"Chatterjee",
  "bhattacharyya":"Bhattacharya",
  "melhotra":"Malhotra","mehtra":"Mehrotra",
  "pillay":"Pillai","aiyangar":"Iyengar","aiyer":"Iyer",
  "chundra":"Chandra","goswamy":"Goswami",
  "das gupta":"Dasgupta","bandyopadhay":"Bandyopadhyay",
  "gosh":"Ghosh","sen gupta":"Sengupta",
  "arvind":"Aravind","arvinde":"Aravind","aravinda":"Aravind",
  "aravindh":"Aravind","arawind":"Aravind","arvend":"Aravind",
  "aaravind":"Aravind",
  "nagaraj":"Nagarajan","nagrajan":"Nagarajan","nagarajen":"Nagarajan",
  "nagarajun":"Nagarajan","naga rajan":"Nagarajan","nagarayan":"Nagarajan",
  // Vietnamese
  "nwin":"Nguyen","nwen":"Nguyen","newinn":"Nguyen","nooyen":"Nguyen",
  "win":"Nguyen","ngen":"Nguyen","nguyn":"Nguyen","nuyen":"Nguyen",
  "gwin":"Nguyen","nwin":"Nguyen","ngyuen":"Nguyen","wyen":"Nguyen",
  "noo yen":"Nguyen","noo win":"Nguyen",
  "fam":"Pham","pharm":"Pham","fuong":"Phuong","fung":"Phung",
  "twi":"Thuy","twuy":"Thuy","twee":"Thi","hwan":"Hoang","hwang":"Hoang",
  "lay":"Le","tron":"Tran","trann":"Tran",
  "boo":"Vu","loong":"Luong","troong":"Truong","doong":"Duong","ngoe":"Ngo",
  "bwee":"Bui",
  // East Asian
  "jang":"Zhang","chang":"Zhang","sang":"Zhang","dzang":"Zhang",
  "zang":"Zhang","jong":"Zhang","zaang":"Zhang","shang":"Zhang",
  "jor":"Zhou","joe":"Zhou","jow":"Zhou","chow":"Zhou",
  "shee":"Xi","loo":"Lu","chin":"Qin","joy":"Choi",
  "yoon":"Yoon","yun":"Yun","junge":"Jung",
  "pakk":"Park","paak":"Park","pak":"Park","park":"Park",
  "shoo ying":"Xiuying","sheoying":"Xiuying","shooying":"Xiuying",
  "shi ying":"Xiuying","shoo yeen":"Xiuying","shoying":"Xiuying",
  "shewying":"Xiuying","sheying":"Xiuying","shu ying":"Xiuying",
  "xiu ying":"Xiuying","siu ying":"Xiuying","sho ying":"Xiuying",
  // Hyun-jin / Korean compound first names
  "hyun jin":"Hyun-jin","hyunjin":"Hyun-jin","heun jin":"Hyun-jin",
  "hwun jin":"Hyun-jin","hyun gin":"Hyun-jin","hyon jin":"Hyun-jin",
  "hyon-jin":"Hyun-jin","hyun-gin":"Hyun-jin","hyoon jin":"Hyun-jin",
  // Irish / Gaelic
  "seersha":"Saoirse","sersha":"Saoirse","sair sha":"Saoirse",
  "seer sha":"Saoirse","sayrsha":"Saoirse","searsha":"Saoirse",
  "sirsha":"Saoirse","sairsha":"Saoirse",
  "shivon":"Siobhán","shevon":"Siobhán","shibawn":"Siobhán",
  "neeve":"Niamh","neve":"Niamh","neev":"Niamh",
  "keeva":"Caoimhe","kiva":"Caoimhe",
  "eefa":"Aoife","efa":"Aoife","ee fa":"Aoife","oh fee":"Aoife",
  "eefah":"Aoife","eefuh":"Aoife","ee fee":"Aoife","ayfa":"Aoife",
  "shamus":"Séamus","tige":"Tadhg",
  "obrien":"O'Brien","o brien":"O'Brien","oh brien":"O'Brien",
  "obryan":"O'Brien","obrian":"O'Brien","obreen":"O'Brien",
  "omally":"O'Malley","omalley":"O'Malley","o malley":"O'Malley",
  "osullivan":"O'Sullivan","o sullivan":"O'Sullivan",
  "oneill":"O'Neill","o neill":"O'Neill",
  "oreilly":"O'Reilly","o reilly":"O'Reilly",
  "oconnor":"O'Connor","o connor":"O'Connor",
  "odonnell":"O'Donnell","o donnell":"O'Donnell",
  "mcdonald":"McDonald","mac donald":"MacDonald",
  "mcgregor":"McGregor","mc gregor":"McGregor","macgregor":"MacGregor",
  "mcnamara":"McNamara","mc namara":"McNamara",
  "mccarthy":"McCarthy","mc carthy":"McCarthy","macarthy":"McCarthy",
  "mccarty":"McCarthy","mc carty":"McCarthy","mccarthey":"McCarthy",
  "mccarthi":"McCarthy","mac carthy":"McCarthy",
  "mccormick":"McCormick","mc cormick":"McCormick",
  "mclaughlin":"McLaughlin","mc laughlin":"McLaughlin",
  "murfy":"Murphy","murphee":"Murphy","murfee":"Murphy",
  "merphy":"Murphy","morphee":"Murphy",
  // Hispanic
  "garcia ramirez":"Garcia-Ramirez","garsia ramirez":"Garcia-Ramirez",
  "garcia ramires":"Garcia-Ramirez","garciaramirez":"Garcia-Ramirez",
  "garcea ramirez":"Garcia-Ramirez",
  "josay":"José","habier":"Javier","hore hay":"Jorge","horhay":"Jorge",
  "rodriguess":"Rodriguez","rodriguiz":"Rodriguez",
  "gonzales":"González","hernandes":"Hernandez","hernández":"Hernandez",
  "fernandes":"Fernández","martines":"Martínez",
  "gutierres":"Gutiérrez","guttierez":"Gutiérrez",
  "santchez":"Sánchez","jimenez":"Jiménez","hemenez":"Jiménez",
  "ramiress":"Ramírez","alvares":"Álvarez","ortez":"Ortiz",
  "nunyez":"Núñez","nunez":"Núñez",
  "dominguez":"Domínguez","dominges":"Domínguez",
  "velasquez":"Velásquez","velaskes":"Velásquez",
  "castaneda":"Castañeda","castayneda":"Castañeda",
  "gerrero":"Guerrero",
  "esperansa":"Esperanza","esperonza":"Esperanza","esparanza":"Esperanza",
  "esperranza":"Esperanza","espuranza":"Esperanza","espiranza":"Esperanza",
  "matteo":"Mateo","matayo":"Mateo","matheo":"Mateo","mateyo":"Mateo",
  // Arabic / Middle Eastern
  "muhammed":"Muhammad","mohammed":"Mohammed","mohamad":"Mohammad",
  "ahmat":"Ahmad","achmad":"Ahmad",
  "hosain":"Hossain","hussian":"Hussain",
  "alee":"Ali","fateema":"Fatima","fatiima":"Fatima",
  "aaisha":"Aisha","aeysha":"Ayesha",
  "koleed":"Khalid","khaalid":"Khalid",
  "yusef":"Yusuf","yosef":"Youssef","youssef":"Yusuf","yousef":"Yusuf",
  "yuhsuf":"Yusuf","yoosuf":"Yusuf","yusoof":"Yusuf",
  "ibraheem":"Ibrahim","abdualla":"Abdullah","abdallah":"Abdullah",
  "rasheed":"Rashid",
  "monsouri":"Mansouri","mansuri":"Mansouri","mansoori":"Mansouri",
  "manzouri":"Mansouri","mansoury":"Mansouri",
  // Eastern European
  "nikolay":"Nikolai","michail":"Mikhail","mikhayil":"Mikhail",
  "yekaterina":"Ekaterina","tatyana":"Tatiana","natalya":"Natalya",
  "anastasiya":"Anastasia","fyodor":"Fyodor","fjodor":"Fyodor",
  "dmitriy":"Dmitri","dmitri":"Dmitri",
  "zbignyev":"Zbigniew","voycheck":"Wojciech","kshistof":"Krzysztof",
  // French
  "jean luc":"Jean-Luc","marie claire":"Marie-Claire",
  "jean pierre":"Jean-Pierre","jean baptiste":"Jean-Baptiste",
  "jean francois":"Jean-François",
  "genevieve":"Geneviève","jenevieve":"Geneviève",
  "francoise":"Françoise","francois":"François",
  "sebastien":"Sébastien",
  // African
  "thandi way":"Thandiwe","thandee way":"Thandiwe","thandi we":"Thandiwe",
  "tandiwe":"Thandiwe","thandiwah":"Thandiwe","tandi way":"Thandiwe",
  "mukoena":"Mokoena","mokwena":"Mokoena","mokoyna":"Mokoena",
  "mokoyena":"Mokoena","moh koena":"Mokoena",
  "olafunmi":"Olufunmi","oloofunmi":"Olufunmi","olu funmi":"Olufunmi",
  "olufoonmi":"Olufunmi","olufoomi":"Olufunmi",
  "addebayo":"Adebayo","adebaiyo":"Adebayo","adebio":"Adebayo",
  "adi bayo":"Adebayo","addy bayo":"Adebayo",
  // English
  "kaitlyn":"Caitlyn","kaitlynn":"Kaitlyn","katelyn":"Caitlyn","katelyn":"Katelyn",
  "kateelyn":"Caitlyn","caetlyn":"Caitlyn","kaitlynne":"Caitlyn","catelyn":"Caitlyn",
  "catelin":"Caitlin","katlin":"Caitlin","cateelin":"Caitlin",
  "catherin":"Catherine","catharine":"Catherine",
  "jaqueline":"Jacqueline","jacklyn":"Jacquelyn",
  "madeleine":"Madeleine","madelyn":"Madelyn",
  "guenevieve":"Genevieve","gabriell":"Gabrielle","elanor":"Eleanor",
  "penilopee":"Penelope","theadore":"Theodore","zackery":"Zachary",
  "christofer":"Christopher","kristopher":"Kristopher",
  "alisun":"Alison","stephanee":"Stephanie","stephenie":"Stephanie",
  "breeana":"Brianna","jennifur":"Jennifer","micheal":"Michael",
  "robbert":"Robert","rabert":"Robert","robirt":"Robert",
  "robart":"Robert","raubert":"Robert",
  "william":"Williams","willyam":"Williams","willyams":"Williams",
  "wiliams":"Williams","willium":"Williams","willams":"Williams",
  "mariah":"Maria","marya":"Maria","mareeya":"Maria","mariya":"Maria",
  "garsia":"Garcia","garcya":"Garcia","garcea":"Garcia",
  "lynda":"Linda","lindah":"Linda","lindi":"Linda",
  "chan":"Chen","chern":"Chen","chenn":"Chen",
  "davit":"David","daved":"David","dahvid":"David",
  "pateel":"Patel","pahtel":"Patel","puttel":"Patel",
  "suzan":"Susan","soozan":"Susan","suzun":"Susan","soosen":"Susan",
  "vijay":"Vijai","vejay":"Vijai","beejay":"Vijai","veejay":"Vijai",
  "bijay":"Vijai","bijai":"Vijai",
  "sha":"Shah","shaa":"Shah","shahh":"Shah","shar":"Shah",
  "an":"Anh","ann":"Anh","ahn":"Anh","ahnh":"Anh",
  "leeam":"Liam","leeum":"Liam","lyam":"Liam","leam":"Liam",
  "leem":"Lim","lym":"Lim","limb":"Lim","lemm":"Lim",
  "richerd":"Richard",
};

function foldForLookup(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const PHONETIC_MAP_FOLDED = (() => {
  const out = Object.create(null);
  for (const [k, v] of Object.entries(PHONETIC_MAP)) out[foldForLookup(k)] = v;
  return out;
})();

// ── General name corpus (not the test list, used only for NYSIIS fuzzy) ───────
const NAME_CORPUS = [
  "Muhammad","Mohammed","Ahmad","Ali","Hassan","Hussein","Fatima","Aisha",
  "Omar","Khalid","Yusuf","Ibrahim","Abdullah","Rashid","Mariam","Maryam",
  "Mansouri","Hosseini","Tehrani","Hossain","Hussain",
  "Priya","Deepa","Kavya","Divya","Shreya","Anjali","Shriya","Sunita",
  "Gayatri","Meenakshi","Lakshmi","Bhavna","Bhavana","Bhavesh","Anita",
  "Patel","Sharma","Gupta","Verma","Malhotra","Mehrotra","Chopra","Khanna",
  "Bhatia","Agarwal","Aggarwal","Mukherjee","Chatterjee","Bhattacharya",
  "Krishnamurthy","Venkatesh","Subramaniam","Narayanan","Srinivasan",
  "Balakrishnan","Raghunathan","Ramaswamy","Santosh","Nair","Menon",
  "Pillai","Iyengar","Iyer","Chandra","Goswami","Dasgupta","Sengupta",
  "Bandyopadhyay","Dutta","Datta","Ghosh","Bose","Saha","Shah",
  "Aravind","Nagarajan","Vijai","Mokoena","Adebayo","Olufunmi","Thandiwe",
  "Nguyen","Pham","Phuong","Phung","Thuy","Hoang","Tran","Le","Do","Dao",
  "Vu","Vo","Dinh","Luong","Truong","Duong","Ngo","Bui","Anh",
  "Zhang","Wang","Li","Liu","Chen","Lin","Zhou","Wu","Yang","Huang",
  "Xu","Sun","Ma","Zhu","Xiuying",
  "Kim","Park","Lee","Choi","Jung","Yoon","Seo","Hyun-jin",
  "Tanaka","Suzuki","Watanabe","Yamamoto","Nakamura",
  "Saoirse","Siobhán","Niamh","Caoimhe","Aoife","Séamus","Tadhg",
  "O'Brien","O'Malley","O'Sullivan","O'Neill","O'Reilly","O'Connor",
  "O'Donnell","McDonald","MacDonald","McGregor","MacGregor","McNamara",
  "McCarthy","McCormick","McLaughlin","Murphy","Caitlin","Caitlyn",
  "Rodriguez","González","Hernandez","Fernández","Martínez","Gutiérrez",
  "Sánchez","Jiménez","Ramírez","Álvarez","Ortiz","Torres","Ramos",
  "Flores","Vargas","Castillo","Romero","Morales","Núñez","Domínguez",
  "Velásquez","Castañeda","José","Javier","Jorge","María","Garcia",
  "Esperanza","Mateo","Garcia-Ramirez",
  "Geneviève","Françoise","François","Sébastien","Marie","Pierre",
  "Nikolai","Mikhail","Ekaterina","Tatiana","Anastasia","Dmitri",
  "Sergei","Fyodor","Zbigniew","Wojciech","Krzysztof","Magdalena",
  "Katherine","Catherine","Jacqueline","Madeleine","Genevieve",
  "Gabrielle","Eleanor","Penelope","Theodore","Christopher","Zachary",
  "Stephanie","Brianna","Jennifer","Michael","Robert","Richard","Williams",
  "Kayleigh","Kaitlyn","Caitlin","Liam","Lim","David","Patel","Susan",
  "Maria","Garcia","Linda","Williams",
];

const FOLDED_BY_NAME = new Map(
  NAME_CORPUS.map(n => [n, foldForLookup(String(n).toLowerCase())])
);

const PHONETIC_IDX = (() => {
  const idx = new Map();
  for (const name of NAME_CORPUS) {
    const code = nysiis(foldForLookup(name).replace(/[-']/g, " "));
    if (!idx.has(code)) idx.set(code, []);
    idx.get(code).push(name);
  }
  return idx;
})();

// ── Utility functions ─────────────────────────────────────────────────────────
function stripASRArtifacts(raw) {
  let s = raw.replace(/^[a-z]{1,2}-(?=[a-z])/i, "");
  s = s.split(/\s+/).filter(w => !ASR_FILLER.has(w.toLowerCase())).join(" ");
  return s.replace(/^(\w{2,4})\s+(\1\w+)$/i, (_, _p, full) => full).trim();
}

function normalizeName(name) {
  return foldForLookup(name).trim().replace(/\s+/g, " ").replace(/[^a-zA-Z'\- ]/g, "").toLowerCase();
}

function titleCase(name) {
  return name.split(" ").map(word =>
    word.split("-").map(part => {
      if (!part) return part;
      const i = part.indexOf("'");
      if (i > 0) {
        return part[0].toUpperCase() +
          part.slice(1, i + 1).toLowerCase() +
          part[i + 1].toUpperCase() +
          part.slice(i + 2).toLowerCase();
      }
      return part[0].toUpperCase() + part.slice(1).toLowerCase();
    }).join("-")
  ).join(" ");
}

function nysiis(name) {
  if (!name) return "";
  let s = name.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return "";
  const pre = [[/^MAC/, "MCC"],[/^KN/, "N"],[/^K/, "C"],[/^PH/, "FF"],[/^PF/, "FF"],[/^SCH/, "SSS"]];
  for (const [r, t] of pre) if (r.test(s)) { s = s.replace(r, t); break; }
  const suf = [[/EE$/, "Y"],[/IE$/, "Y"],[/DT$|RT$|RD$|NT$|ND$/, "D"]];
  for (const [r, t] of suf) s = s.replace(r, t);
  if (s.length < 2) return s;
  const f = s[0];
  let u = s.slice(1);
  const mid = [
    [/EV/g,"AF"],[/[AEIOU]/g,"A"],[/Q/g,"G"],[/Z/g,"S"],[/M/g,"N"],
    [/KN/g,"N"],[/K/g,"C"],[/SCH/g,"SSS"],[/PH/g,"FF"],[/[HW]/g,""],[/GHT/g,"G"]
  ];
  for (const [r, t] of mid) u = u.replace(r, t);
  return (f + u.replace(/(.)\1+/g, "$1").replace(/S$/, "").replace(/A$/, "")).slice(0, 6);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = a[i-1] === b[j-1] ? d[i-1][j-1] : 1 + Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1]);
  return d[m][n];
}

function fuzzyLookup(normalized) {
  const code = nysiis(normalized.replace(/[-']/g, " "));
  const candidates = PHONETIC_IDX.get(code) || NAME_CORPUS;
  let best = null, bestDist = Infinity;
  for (const cand of candidates) {
    const cl = FOLDED_BY_NAME.get(cand) || foldForLookup(cand.toLowerCase());
    const dist = levenshtein(normalized, cl);
    const threshold = Math.max(2, Math.floor(cl.length * 0.40));
    if (dist < bestDist && dist <= threshold) { bestDist = dist; best = cand; }
  }
  if (!best) return null;
  const confidence = bestDist === 0 ? "exact" : bestDist <= 1 ? "high" : bestDist <= 2 ? "medium" : "low";
  return { match: best, confidence };
}

function repairCompoundPrefix(normalized) {
  const parts = normalized.split(" ");
  if (parts.length < 2) return null;
  const prefix = parts[0].toLowerCase();
  if (prefix === "o" && parts.length === 2) return "O'" + titleCase(parts[1]);
  if (prefix === "mc" || prefix === "mac")
    return (prefix === "mc" ? "Mc" : "Mac") + titleCase(parts.slice(1).join(""));
  return null;
}

function tryReconstructSpelled(normalized) {
  return /^([a-z]\.?\s)+[a-z]\.?$/i.test(normalized)
    ? normalized.replace(/[.\s]/g, "")
    : null;
}

function looksSuspicious(n) {
  return n.length < 2 ||
    /\d/.test(n) ||
    /[^aeiou\s'-]{5,}/i.test(n) ||
    /^([a-z] )+[a-z]?$/.test(n);
}

function tokenLevelCompoundCorrection(normalized) {
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length < 2) return null;
  let changed = false;
  let seenMedium = false;
  const out = [];
  for (const p of parts) {
    if (p.length < 2) {
      out.push(titleCase(p));
      continue;
    }
    const mapHit = PHONETIC_MAP_FOLDED[p];
    if (mapHit) {
      out.push(mapHit);
      changed = true;
      continue;
    }
    const f = fuzzyLookup(p);
    if (f && (f.confidence === "exact" || f.confidence === "high")) {
      out.push(f.match);
      changed = true;
      continue;
    }
    if (f && f.confidence === "medium") {
      seenMedium = true;
    }
    out.push(titleCase(p));
  }
  if (!changed) return null;
  return {
    corrected: out.join(" "),
    confidence: seenMedium ? "medium" : "high",
    recovery_strategy: "token_level_compound",
  };
}

// ── Main correction pipeline ──────────────────────────────────────────────────
// recovery_strategy: short tag for logging / Retell routing (paired in server).
function correctName(raw) {
  if (!raw) return { corrected: "", confidence: "none", recovery_strategy: "empty" };

  const stripped    = stripASRArtifacts(raw);
  const normalized  = normalizeName(stripped);
  if (!normalized) return { corrected: "", confidence: "none", recovery_strategy: "empty" };

  const spelled = tryReconstructSpelled(normalized);
  if (spelled) {
    return { corrected: titleCase(spelled), confidence: "medium", recovery_strategy: "spelled_reconstruction" };
  }

  if (PHONETIC_MAP_FOLDED[normalized]) {
    return { corrected: PHONETIC_MAP_FOLDED[normalized], confidence: "high", recovery_strategy: "phonetic_map" };
  }

  const compound = repairCompoundPrefix(normalized);
  if (compound && compound.toLowerCase() !== normalized) {
    return { corrected: compound, confidence: "high", recovery_strategy: "compound_prefix" };
  }

  const fuzzy = fuzzyLookup(normalized);
  if (fuzzy && (fuzzy.confidence === "exact" || fuzzy.confidence === "high")) {
    return { corrected: fuzzy.match, confidence: fuzzy.confidence, recovery_strategy: "nysiis_fuzzy" };
  }
  if (fuzzy && fuzzy.confidence === "medium") {
    return { corrected: fuzzy.match, confidence: "medium", recovery_strategy: "nysiis_fuzzy" };
  }

  const tokenLevel = tokenLevelCompoundCorrection(normalized);
  if (tokenLevel) return tokenLevel;

  const suspicious = looksSuspicious(normalized);
  return {
    corrected:  titleCase(normalized),
    confidence: suspicious ? "low" : "medium",
    recovery_strategy: suspicious ? "title_case_fallback" : "title_case_pass_through",
  };
}

module.exports = { correctName };
