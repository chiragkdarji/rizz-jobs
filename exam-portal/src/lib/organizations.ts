// Organization registry for /org/[slug] hub pages.
// aliases: matched against notification titles (case-insensitive substring).
// Keep aliases lowercase and free of commas/percent signs (used in PostgREST or() filters).

export interface OrgInfo {
  slug: string;
  name: string;
  fullName: string;
  aliases: string[];
  officialSite: string;
  blurb: string;
}

export const ORGANIZATIONS: OrgInfo[] = [
  { slug: "upsc", name: "UPSC", fullName: "Union Public Service Commission", aliases: ["upsc", "civil services"], officialSite: "https://upsc.gov.in", blurb: "Conducts the Civil Services Examination (IAS, IPS, IFS), CDS, NDA, CAPF and central government Group A recruitments." },
  { slug: "ssc", name: "SSC", fullName: "Staff Selection Commission", aliases: ["ssc", "cgl", "chsl"], officialSite: "https://ssc.gov.in", blurb: "Recruits for Group B and C posts across central ministries via CGL, CHSL, MTS, GD Constable and Stenographer exams." },
  { slug: "ibps", name: "IBPS", fullName: "Institute of Banking Personnel Selection", aliases: ["ibps"], officialSite: "https://www.ibps.in", blurb: "Common recruitment for public sector banks: PO/MT, Clerk, SO and RRB exams." },
  { slug: "sbi", name: "SBI", fullName: "State Bank of India", aliases: ["sbi", "state bank of india"], officialSite: "https://sbi.co.in/careers", blurb: "India's largest bank; recruits Probationary Officers, Clerks (Junior Associates) and Specialist Officers." },
  { slug: "rbi", name: "RBI", fullName: "Reserve Bank of India", aliases: ["rbi", "reserve bank"], officialSite: "https://rbi.org.in", blurb: "India's central bank; recruits Grade B Officers, Assistants and specialist roles." },
  { slug: "railways", name: "Railways (RRB)", fullName: "Railway Recruitment Boards", aliases: ["rrb", "railway", "rrc", "rpf"], officialSite: "https://indianrailways.gov.in", blurb: "The largest government recruiter: NTPC, Group D, ALP, Technician, JE and RPF posts across zonal boards." },
  { slug: "indian-army", name: "Indian Army", fullName: "Indian Army", aliases: ["indian army", "agniveer cee", "territorial army"], officialSite: "https://joinindianarmy.nic.in", blurb: "Agniveer, officer entries (NDA, CDS, TES, TGC) and departmental recruitments." },
  { slug: "indian-navy", name: "Indian Navy", fullName: "Indian Navy", aliases: ["indian navy", "navy"], officialSite: "https://www.joinindiannavy.gov.in", blurb: "Agniveer SSR/MR, officer entries and tradesman recruitments." },
  { slug: "indian-air-force", name: "Indian Air Force", fullName: "Indian Air Force", aliases: ["air force", "afcat", "agniveer vayu"], officialSite: "https://indianairforce.nic.in", blurb: "AFCAT officer entries and Agniveer Vayu intakes." },
  { slug: "india-post", name: "India Post", fullName: "Department of Posts", aliases: ["india post", "gds", "gramin dak sevak", "postal"], officialSite: "https://www.indiapost.gov.in", blurb: "Gramin Dak Sevak (GDS), Postman and Mail Guard recruitments across postal circles." },
  { slug: "lic", name: "LIC", fullName: "Life Insurance Corporation of India", aliases: ["lic"], officialSite: "https://licindia.in", blurb: "AAO, ADO and Assistant recruitments in India's largest insurer." },
  { slug: "esic", name: "ESIC", fullName: "Employees' State Insurance Corporation", aliases: ["esic"], officialSite: "https://esic.gov.in", blurb: "UDC, MTS, Stenographer and paramedical recruitments." },
  { slug: "epfo", name: "EPFO", fullName: "Employees' Provident Fund Organisation", aliases: ["epfo"], officialSite: "https://www.epfindia.gov.in", blurb: "SSA, Stenographer and Enforcement Officer recruitments." },
  { slug: "drdo", name: "DRDO", fullName: "Defence Research and Development Organisation", aliases: ["drdo"], officialSite: "https://drdo.gov.in", blurb: "Scientist B, Technician and CEPTAM recruitments in defence R&D." },
  { slug: "isro", name: "ISRO", fullName: "Indian Space Research Organisation", aliases: ["isro"], officialSite: "https://www.isro.gov.in", blurb: "Scientist/Engineer and Technician recruitments in India's space agency." },
  { slug: "nta", name: "NTA", fullName: "National Testing Agency", aliases: ["nta", "neet", "jee main", "cuet", "ugc net"], officialSite: "https://nta.ac.in", blurb: "Conducts NEET, JEE Main, CUET and UGC NET entrance examinations." },
  { slug: "aiims", name: "AIIMS", fullName: "All India Institute of Medical Sciences", aliases: ["aiims"], officialSite: "https://aiimsexams.ac.in", blurb: "Nursing Officer (NORCET), faculty and paramedical recruitments." },
  { slug: "crpf", name: "CRPF", fullName: "Central Reserve Police Force", aliases: ["crpf"], officialSite: "https://crpf.gov.in", blurb: "Constable, Head Constable and paramedical staff recruitments." },
  { slug: "bsf", name: "BSF", fullName: "Border Security Force", aliases: ["bsf"], officialSite: "https://bsf.gov.in", blurb: "Constable (Tradesman), Head Constable and SI recruitments." },
  { slug: "cisf", name: "CISF", fullName: "Central Industrial Security Force", aliases: ["cisf"], officialSite: "https://cisf.gov.in", blurb: "Constable and ASI recruitments for industrial security." },
  { slug: "bpsc", name: "BPSC", fullName: "Bihar Public Service Commission", aliases: ["bpsc", "bihar"], officialSite: "https://bpsc.bihar.gov.in", blurb: "Combined Competitive Exam, TRE teacher recruitments and state services of Bihar." },
  { slug: "uppsc", name: "UPPSC", fullName: "Uttar Pradesh Public Service Commission", aliases: ["uppsc"], officialSite: "https://uppsc.up.nic.in", blurb: "PCS, RO/ARO and state services of Uttar Pradesh." },
  { slug: "upsssc", name: "UPSSSC", fullName: "UP Subordinate Services Selection Commission", aliases: ["upsssc"], officialSite: "https://upsssc.gov.in", blurb: "PET, Lekhpal, Junior Assistant and UP Group C recruitments." },
  { slug: "up-police", name: "UP Police", fullName: "Uttar Pradesh Police Recruitment Board", aliases: ["up police", "upprpb"], officialSite: "https://uppbpb.gov.in", blurb: "Constable, SI and Jail Warder recruitments in UP Police." },
  { slug: "mpsc", name: "MPSC", fullName: "Maharashtra Public Service Commission", aliases: ["mpsc", "maharashtra"], officialSite: "https://mpsc.gov.in", blurb: "State services and Group B/C recruitments of Maharashtra." },
  { slug: "mppsc", name: "MPPSC", fullName: "Madhya Pradesh Public Service Commission", aliases: ["mppsc", "madhya pradesh"], officialSite: "https://mppsc.mp.gov.in", blurb: "State services and forest service exams of Madhya Pradesh." },
  { slug: "rpsc", name: "RPSC", fullName: "Rajasthan Public Service Commission", aliases: ["rpsc", "ras "], officialSite: "https://rpsc.rajasthan.gov.in", blurb: "RAS, teacher and state services of Rajasthan." },
  { slug: "rssb", name: "RSSB (RSMSSB)", fullName: "Rajasthan Staff Selection Board", aliases: ["rssb", "rsmssb", "rajasthan cet", "rajasthan staff"], officialSite: "https://rssb.rajasthan.gov.in", blurb: "CET, Patwari, LDC and Rajasthan Group C recruitments." },
  { slug: "gpsc", name: "GPSC", fullName: "Gujarat Public Service Commission", aliases: ["gpsc", "gujarat"], officialSite: "https://gpsc.gujarat.gov.in", blurb: "State services, Class 1-2 and municipal service exams of Gujarat." },
  { slug: "gsssb", name: "GSSSB", fullName: "Gujarat Gaun Seva Pasandgi Mandal", aliases: ["gsssb"], officialSite: "https://gsssb.gujarat.gov.in", blurb: "CCE and Group C recruitments of Gujarat." },
  { slug: "hssc", name: "HSSC", fullName: "Haryana Staff Selection Commission", aliases: ["hssc", "haryana"], officialSite: "https://hssc.gov.in", blurb: "CET and Group C/D recruitments of Haryana." },
  { slug: "tnpsc", name: "TNPSC", fullName: "Tamil Nadu Public Service Commission", aliases: ["tnpsc", "tamil nadu"], officialSite: "https://www.tnpsc.gov.in", blurb: "Group 1-4 and state services of Tamil Nadu." },
  { slug: "kerala-psc", name: "Kerala PSC", fullName: "Kerala Public Service Commission", aliases: ["kerala"], officialSite: "https://www.keralapsc.gov.in", blurb: "LDC, LGS, degree-level and departmental exams of Kerala." },
  { slug: "wbpsc", name: "WBPSC", fullName: "West Bengal Public Service Commission", aliases: ["wbpsc", "west bengal"], officialSite: "https://wbpsc.gov.in", blurb: "WBCS and state services of West Bengal." },
  { slug: "appsc", name: "APPSC", fullName: "Andhra Pradesh Public Service Commission", aliases: ["appsc", "andhra"], officialSite: "https://psc.ap.gov.in", blurb: "Group 1-4 and departmental exams of Andhra Pradesh." },
  { slug: "tspsc", name: "TSPSC", fullName: "Telangana Public Service Commission", aliases: ["tspsc", "telangana"], officialSite: "https://www.tspsc.gov.in", blurb: "Group services and teacher recruitments of Telangana." },
  { slug: "osssc", name: "OSSSC", fullName: "Odisha Subordinate Staff Selection Commission", aliases: ["osssc", "ossc", "odisha"], officialSite: "https://www.osssc.gov.in", blurb: "RI, ARI, Amin and Odisha Group C recruitments." },
  { slug: "jssc", name: "JSSC", fullName: "Jharkhand Staff Selection Commission", aliases: ["jssc", "jharkhand"], officialSite: "https://jssc.nic.in", blurb: "CGL and Group C recruitments of Jharkhand." },
  { slug: "dsssb", name: "DSSSB", fullName: "Delhi Subordinate Services Selection Board", aliases: ["dsssb", "delhi"], officialSite: "https://dsssb.delhi.gov.in", blurb: "TGT/PGT teachers, clerical and technical posts under GNCT Delhi." },
  { slug: "high-courts", name: "High Courts", fullName: "High Courts of India", aliases: ["high court", "judicial service"], officialSite: "https://ecourts.gov.in", blurb: "Judicial services, clerk, stenographer and peon recruitments across state High Courts." },
];

export function getOrg(slug: string): OrgInfo | undefined {
  return ORGANIZATIONS.find((o) => o.slug === slug);
}
