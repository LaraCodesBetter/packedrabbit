"""Count FMCSA's public household-goods complaint records for one state.

Reads FMCSA's Protect Your Move lookup (ai.fmcsa.dot.gov/hhg): the list of interstate
movers whose main office is in the state, then each mover's record, which shows the
National Consumer Complaint Database counts for the last four years, by category.
Writes totals only: no company names, no addresses, nothing about anyone who complained.
    python3 fmcsa_state.py WY out.json
"""
import sys, re, html, json, time, urllib.request
ST, OUT = sys.argv[1], sys.argv[2]
UA = "Mozilla/5.0 (compatible; PackedRabbitResearch/1.0; +https://packedrabbit.com/)"
def get(u, tries=4):
    for k in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=90).read().decode("latin-1")
        except Exception as e:
            time.sleep(10 * (k + 1)); err = e
    raise err
def toks(s):
    s = re.sub(r"<script.*?</script>|<style.*?</style>", "", s, flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", "|", s))
    return [x.strip() for x in t.split("|") if x.strip()]
lst = get(f"https://ai.fmcsa.dot.gov/hhg/SearchResults.asp?ads=a&search=5&state={ST}")
ids = list(dict.fromkeys(re.findall(r"SearchDetails\.asp\?ads=a&id=(\d+)&id2=(\d+)", lst)))
R = dict(state=ST, listed=len(ids), read=0, failed=0, authorized=0, broker=0, carrier=0, with_complaints=0,
         by_year={}, by_category={}, by_year_authorized={}, by_year_broker={}, data_date="")
for a, b in ids:
    time.sleep(1.5)
    try:
        s = get(f"https://ai.fmcsa.dot.gov/hhg/SearchDetails.asp?ads=a&id={a}&id2={b}")
    except Exception:
        R["failed"] += 1; continue
    T = toks(s); J = "|".join(T); R["read"] += 1
    m = re.search(r"The data is from (\d+/\d+/\d+)", J)
    if m: R["data_date"] = m.group(1)
    auth = "is NOT authorized" not in J
    brk = bool(re.search(r"\|Broker\|Yes", J)); car = bool(re.search(r"\|Carrier\|Yes", J))
    R["authorized"] += auth; R["broker"] += brk; R["carrier"] += car
    if "Total Complaints" not in J: continue
    i = T.index(next(x for x in T if x.startswith("Total Complaints")))
    j = next((k for k in range(i, len(T)) if T[k].startswith("Complaints by Category")), len(T))
    nums = [x for x in T[i + 1:j] if re.fullmatch(r"\d+", x) or re.fullmatch(r"\*\d", x)]
    nums = [x for x in nums if not x.startswith("*")]
    any_c = False
    for y, n in zip(nums[0::2], nums[1::2]):
        n = int(n); any_c |= n > 0
        R["by_year"][y] = R["by_year"].get(y, 0) + n
        if auth: R["by_year_authorized"][y] = R["by_year_authorized"].get(y, 0) + n
        if brk: R["by_year_broker"][y] = R["by_year_broker"].get(y, 0) + n
    R["with_complaints"] += any_c
    # categories: after the header, the years, then name followed by one value per year
    k = j + 1
    while k < len(T) and not re.fullmatch(r"(19|20)\d\d", T[k]): k += 1
    years = []
    while k < len(T) and re.fullmatch(r"(19|20)\d\d", T[k]): years.append(T[k]); k += 1
    while k < len(T) and T[k] != "*1":
        name = re.sub(r"\*\d$", "", T[k]).strip(); vals = T[k + 1:k + 1 + len(years)]
        if len(vals) < len(years) or not all(re.fullmatch(r"\d+|n/a", v) for v in vals): k += 1; continue
        for y, v in zip(years, vals):
            if v.isdigit(): R["by_category"].setdefault(name, {}); R["by_category"][name][y] = R["by_category"][name].get(y, 0) + int(v)
        k += 1 + len(years)
json.dump(R, open(OUT, "w"), indent=1)
print(json.dumps({k: R[k] for k in ("state", "listed", "read", "failed", "authorized", "with_complaints", "by_year", "data_date")}))
