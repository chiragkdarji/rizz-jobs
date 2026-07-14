"""
Organization registry for title normalization and entity resolution.

Every published notification title must name its recruiting organization.
This registry maps title aliases and official domains to a canonical org name.
"""
import re
from urllib.parse import urlparse

# (canonical name, title aliases (regex-safe words), official domain fragments)
ORGANIZATIONS: list[tuple[str, list[str], list[str]]] = [
    ("UPSC", ["upsc", "union public service commission", "civil services"], ["upsc.gov.in", "upsconline"]),
    ("SSC", ["ssc", "staff selection commission", "cgl", "chsl", "mts", "stenographer"], ["ssc.gov.in", "ssc.nic.in"]),
    ("IBPS", ["ibps"], ["ibps.in"]),
    ("SBI", ["sbi", "state bank of india"], ["sbi.co.in"]),
    ("RBI", ["rbi", "reserve bank of india"], ["rbi.org.in"]),
    ("NABARD", ["nabard"], ["nabard.org"]),
    ("NaBFID", ["nabfid"], ["nabfid.org"]),
    ("LIC", ["lic", "life insurance corporation"], ["licindia.in"]),
    ("ESIC", ["esic"], ["esic.gov.in", "esic.in"]),
    ("EPFO", ["epfo"], ["epfindia.gov.in"]),
    ("Indian Railways RRB", ["rrb", "railway recruitment board", "rrc", "ntpc", "railway group d", "rpf"], ["rrbapply", "rrbcdg", "indianrailways", "rrb", "rpf.indianrailways"]),
    ("Indian Army", ["indian army", "army", "agniveer cee", "territorial army"], ["joinindianarmy"]),
    ("Indian Navy", ["indian navy", "navy"], ["joinindiannavy"]),
    ("Indian Air Force", ["indian air force", "iaf", "afcat", "agnipath vayu", "agniveer vayu"], ["indianairforce", "afcat.cdac.in", "agnipathvayu"]),
    ("Indian Coast Guard", ["coast guard", "icg"], ["joinindiancoastguard"]),
    ("CRPF", ["crpf"], ["crpf.gov.in"]),
    ("BSF", ["bsf", "border security force"], ["bsf.gov.in", "rectt.bsf"]),
    ("CISF", ["cisf"], ["cisf.gov.in", "cisfrectt"]),
    ("ITBP", ["itbp"], ["itbpolice", "recruit.itbpolice"]),
    ("SSB", ["sashastra seema bal"], ["ssbrectt", "ssb.gov.in"]),
    ("DRDO", ["drdo"], ["drdo.gov.in"]),
    ("ISRO", ["isro"], ["isro.gov.in"]),
    ("BARC", ["barc", "bhabha atomic"], ["barc.gov.in", "barconlineexam"]),
    ("AIIMS", ["aiims"], ["aiims", "aiimsexams"]),
    ("NTA", ["nta", "national testing agency", "neet", "jee main", "cuet", "ugc net"], ["nta.ac.in", "nta.nic.in", "neet.nta", "jeemain"]),
    ("CBSE", ["cbse", "ctet"], ["cbse.gov.in", "ctet.nic.in"]),
    ("KVS", ["kvs", "kendriya vidyalaya"], ["kvsangathan"]),
    ("NVS", ["nvs", "navodaya vidyalaya"], ["navodaya.gov.in"]),
    ("India Post", ["india post", "gds", "gramin dak sevak", "postal circle", "post office"], ["indiapost", "appost.in", "indiapostgdsonline"]),
    ("BPSC", ["bpsc", "bihar public service"], ["bpsc.bihar", "bpsc.bih.nic"]),
    ("UPPSC", ["uppsc", "uttar pradesh public service"], ["uppsc.up.nic"]),
    ("UPSSSC", ["upsssc"], ["upsssc.gov.in"]),
    ("UP Police UPPRPB", ["up police", "upprpb"], ["uppbpb", "upprpb"]),
    ("MPSC", ["mpsc", "maharashtra public service"], ["mpsc.gov.in"]),
    ("MPPSC", ["mppsc", "madhya pradesh public service"], ["mppsc.mp.gov.in", "mppsc.gov.in"]),
    ("RPSC", ["rpsc", "rajasthan public service"], ["rpsc.rajasthan"]),
    ("RSSB", ["rssb", "rsmssb", "rajasthan staff selection", "rajasthan subordinate"], ["rsmssb.rajasthan", "rssb.rajasthan", "recruitment.rajasthan"]),
    ("GPSC", ["gpsc", "gujarat public service"], ["gpsc.gujarat", "gpsc-ojas"]),
    ("GSSSB", ["gsssb", "gujarat gaun seva"], ["gsssb.gujarat", "ojas.gujarat"]),
    ("HPSC", ["hpsc", "haryana public service"], ["hpsc.gov.in"]),
    ("HSSC", ["hssc", "haryana staff selection"], ["hssc.gov.in"]),
    ("KPSC", ["kpsc karnataka", "karnataka public service"], ["kpsc.kar.nic"]),
    ("Kerala PSC", ["kerala psc", "kerala public service"], ["keralapsc"]),
    ("TNPSC", ["tnpsc", "tamil nadu public service"], ["tnpsc.gov.in"]),
    ("APPSC", ["appsc", "andhra pradesh public service"], ["psc.ap.gov.in"]),
    ("TSPSC", ["tspsc", "telangana public service"], ["tspsc.gov.in"]),
    ("WBPSC", ["wbpsc", "west bengal public service"], ["wbpsc.gov.in", "psc.wb.gov.in"]),
    ("OPSC", ["opsc", "odisha public service"], ["opsc.gov.in"]),
    ("OSSC", ["ossc", "odisha staff selection"], ["ossc.gov.in"]),
    ("OSSSC", ["osssc"], ["osssc.gov.in"]),
    ("JPSC", ["jpsc", "jharkhand public service"], ["jpsc.gov.in"]),
    ("JSSC", ["jssc", "jharkhand staff selection"], ["jssc.nic.in"]),
    ("CGPSC", ["cgpsc", "chhattisgarh public service"], ["psc.cg.gov.in"]),
    ("UKPSC", ["ukpsc", "uttarakhand public service"], ["ukpsc.net", "psc.uk.gov.in"]),
    ("HPPSC", ["hppsc", "himachal pradesh public service"], ["hppsc.hp.gov.in"]),
    ("PPSC", ["ppsc", "punjab public service"], ["ppsc.gov.in"]),
    ("DSSSB", ["dsssb", "delhi subordinate services"], ["dsssb.delhi", "dsssbonline"]),
    ("Delhi Police", ["delhi police"], ["delhipolice"]),
    ("UPCISB", ["upcisb", "up cooperative", "up co-operative"], ["upcisb", "upsahkarisevamandal"]),
    ("NHM", ["nhm", "national health mission"], ["nhm."]),
    ("ONGC", ["ongc"], ["ongcindia"]),
    ("NTPC Ltd", ["ntpc limited", "ntpc ltd"], ["ntpc.co.in", "careers.ntpc"]),
    ("BHEL", ["bhel"], ["bhel.com", "careers.bhel"]),
    ("SAIL", ["sail", "steel authority"], ["sail.co.in", "sailcareers"]),
    ("GAIL", ["gail"], ["gailonline"]),
    ("IOCL", ["iocl", "indian oil"], ["iocl.com"]),
    ("BPCL", ["bpcl", "bharat petroleum"], ["bharatpetroleum"]),
    ("HPCL", ["hpcl", "hindustan petroleum"], ["hindustanpetroleum"]),
    ("PGCIL", ["pgcil", "power grid"], ["powergrid.in"]),
    ("NHPC", ["nhpc"], ["nhpcindia"]),
    ("HAL", ["hal", "hindustan aeronautics"], ["hal-india"]),
    ("BEL", ["bel", "bharat electronics"], ["bel-india"]),
    ("BEML", ["beml"], ["bemlindia"]),
    ("RITES", ["rites"], ["rites.com"]),
    ("IRCON", ["ircon"], ["ircon.org"]),
    ("RVNL", ["rvnl", "rail vikas nigam"], ["rvnl.org"]),
    ("CONCOR", ["concor", "container corporation"], ["concorindia"]),
    ("AAI", ["aai", "airports authority"], ["aai.aero"]),
    ("NHAI", ["nhai", "national highways authority"], ["nhai.gov.in"]),
    ("ECGC", ["ecgc"], ["ecgc.in"]),
    ("SIDBI", ["sidbi"], ["sidbi.in"]),
    ("EXIM Bank", ["exim bank"], ["eximbankindia"]),
    ("Bank of Baroda", ["bank of baroda", "bob "], ["bankofbaroda"]),
    ("Bank of India", ["bank of india", "boi "], ["bankofindia"]),
    ("Canara Bank", ["canara bank"], ["canarabank"]),
    ("Central Bank of India", ["central bank of india"], ["centralbankofindia"]),
    ("Union Bank of India", ["union bank"], ["unionbankofindia"]),
    ("Punjab National Bank", ["punjab national bank", "pnb "], ["pnbindia"]),
    ("Indian Bank", ["indian bank"], ["indianbank.in"]),
    ("IDBI Bank", ["idbi"], ["idbibank"]),
    ("Nainital Bank", ["nainital bank"], ["nainitalbank"]),
    ("High Court", ["high court"], ["hcraj", "allahabadhighcourt", "bombayhighcourt", "delhihighcourt", "ecourts"]),
    ("Supreme Court of India", ["supreme court"], ["sci.gov.in"]),
    ("IIT", ["iit "], ["iitb.ac.in", "iitd.ac.in", "iitk.ac.in", "iitm.ac.in", "iitkgp.ac.in"]),
    ("IIM", ["iim "], ["iima.ac.in", "iimb.ac.in", "iimcal.ac.in", "iimk.ac.in"]),
]

# Precompiled alias patterns (word-boundary, case-insensitive)
_ALIAS_PATTERNS = [
    (canonical, re.compile(r"(?<![a-z0-9])" + re.escape(alias.strip()) + r"(?![a-z0-9])", re.IGNORECASE))
    for canonical, aliases, _ in ORGANIZATIONS
    for alias in aliases
]

# Generic org-type words: a title containing these counts as "has an org context"
# even if the specific body is not in the registry (e.g. "Rajkot Municipal Corporation").
_GENERIC_ORG_RE = re.compile(
    r"\b(university|institute|college|court|ministry|department|commission|board|"
    r"authority|council|nigam|corporation|municipal|panchayat|bank|police|army|navy|"
    r"vidyalaya|hospital|aiims|iit|nit|iim|metro|cantonment|zila|district)\b",
    re.IGNORECASE,
)


def find_org_in_title(title: str) -> str | None:
    """Return the canonical org name if the title names a known organization."""
    for canonical, pattern in _ALIAS_PATTERNS:
        if pattern.search(title):
            return canonical
    return None


def title_has_org_context(title: str) -> bool:
    """True if the title names a known org OR a generic org type."""
    return find_org_in_title(title) is not None or bool(_GENERIC_ORG_RE.search(title))


def org_from_url(url: str | None) -> str | None:
    """Resolve the canonical org from an official URL's domain."""
    if not url:
        return None
    try:
        netloc = urlparse(url).netloc.lower()
        full = url.lower()
    except Exception:
        return None
    for canonical, _, domains in ORGANIZATIONS:
        for d in domains:
            if d in netloc or d in full:
                return canonical
    return None
