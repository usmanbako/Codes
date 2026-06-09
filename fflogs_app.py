#!/usr/bin/env python3
"""FFLogs Rotation Viewer — Flask web app."""

import re
from urllib.parse import urlparse, parse_qs, unquote
from flask import Flask, request, jsonify, render_template_string
import requests as http

CLIENT_ID = "a1fc18de-df88-4531-803b-07b66551481b"
CLIENT_SECRET = "YnMekuH37idlySEJdFbhdNGGBFaGWrvKTCLESmeM"
TOKEN_URL = "https://www.fflogs.com/oauth/token"
API_URL = "https://www.fflogs.com/api/v2/client"

app = Flask(__name__)

# ── FFLogs helpers ─────────────────────────────────────────────────────────────

def get_token():
    r = http.post(TOKEN_URL, data={"grant_type": "client_credentials"},
                  auth=(CLIENT_ID, CLIENT_SECRET))
    r.raise_for_status()
    return r.json()["access_token"]


def gql(token, query, variables=None):
    r = http.post(API_URL, json={"query": query, "variables": variables or {}},
                  headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    data = r.json()
    if "errors" in data:
        raise ValueError("; ".join(e["message"] for e in data["errors"]))
    return data["data"]


def fetch_casts(token, report_code, fight_id, source_id):
    query = """
    query($code:String!,$fightIDs:[Int]!,$sourceID:Int!,$startTime:Float){
      reportData { report(code:$code){
        events(fightIDs:$fightIDs,sourceID:$sourceID,dataType:Casts,limit:10000,startTime:$startTime){
          data nextPageTimestamp
        }
      }}
    }"""
    casts, next_ts = [], None
    while True:
        d = gql(token, query, {"code": report_code, "fightIDs": [fight_id],
                               "sourceID": source_id, "startTime": next_ts})
        page = d["reportData"]["report"]["events"]
        casts.extend(e for e in page["data"] if e.get("type") == "cast")
        next_ts = page["nextPageTimestamp"]
        if not next_ts:
            break
    return casts


def fetch_master(token, report_code):
    q = """
    query($code:String!){
      reportData { report(code:$code){
        masterData {
          actors(type:"Player"){ id name }
          abilities { gameID name }
        }
      }}
    }"""
    d = gql(token, q, {"code": report_code})
    md = d["reportData"]["report"]["masterData"]
    actors = {a["name"].lower(): a["id"] for a in md["actors"]}
    abilities = {a["gameID"]: a["name"] for a in md["abilities"]}
    return actors, abilities


def fetch_fights(token, report_code, encounter_id=None):
    q = """
    query($code:String!){
      reportData { report(code:$code){
        fights(killType:Kills){ id name encounterID startTime endTime }
      }}
    }"""
    d = gql(token, q, {"code": report_code})
    fights = d["reportData"]["report"]["fights"]
    if encounter_id:
        fights = [f for f in fights if f["encounterID"] == encounter_id]
    return fights


def fetch_character_reports(token, name, server, region, zone_id=None, boss_id=None):
    q = """
    query($name:String!,$serverSlug:String!,$serverRegion:String!){
      characterData {
        character(name:$name,serverSlug:$serverSlug,serverRegion:$serverRegion){
          name
          recentReports(limit:10){
            data{ code fights(killType:Kills){ id name encounterID startTime endTime } }
          }
        }
      }
    }"""
    d = gql(token, q, {"name": name, "serverSlug": server, "serverRegion": region})
    char = d["characterData"]["character"]
    if not char:
        raise ValueError(f"Character '{name}' not found on {server} ({region})")
    results = []
    for report in char["recentReports"]["data"]:
        for fight in report["fights"] or []:
            if boss_id and fight["encounterID"] != boss_id:
                continue
            results.append((report["code"], fight))
    return char["name"], results


def fmt_ms(ms):
    s = ms / 1000
    m, s = divmod(int(s), 60)
    return f"{m:02d}:{s:02d}"


# ── URL parsing ────────────────────────────────────────────────────────────────

def parse_fflogs_url(url):
    """
    Accepts:
      - Character URL: fflogs.com/character/{region}/{server}/{name}[?zone=X&boss=Y]
      - Report URL:    fflogs.com/reports/{code}[#fight=N]
    Returns dict with keys: type ('character'|'report'), and relevant fields.
    """
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    qs = parse_qs(parsed.query)

    # Report URL
    m = re.match(r"^/reports/([A-Za-z0-9]+)$", path)
    if m:
        code = m.group(1)
        fight_id = None
        if parsed.fragment:
            fm = re.search(r"fight=(\d+)", parsed.fragment)
            if fm:
                fight_id = int(fm.group(1))
        return {"type": "report", "code": code, "fight_id": fight_id}

    # Character URL
    m = re.match(r"^/character/([^/]+)/([^/]+)/(.+)$", path)
    if m:
        region, server, name = m.group(1), m.group(2), m.group(3)
        zone_id = int(qs["zone"][0]) if "zone" in qs else None
        boss_id = int(qs["boss"][0]) if "boss" in qs else None
        return {"type": "character", "region": region.upper(), "server": server,
                "name": unquote(name), "zone_id": zone_id, "boss_id": boss_id}

    raise ValueError("Unrecognised FFLogs URL. Paste a /character/ or /reports/ link.")


# ── API endpoint ───────────────────────────────────────────────────────────────

@app.post("/api/rotation")
def api_rotation():
    body = request.get_json(force=True)
    url = (body.get("url") or "").strip()
    player_name = (body.get("player") or "").strip()  # optional override

    try:
        parsed = parse_fflogs_url(url)
        token = get_token()

        if parsed["type"] == "character":
            char_name, results = fetch_character_reports(
                token, parsed["name"], parsed["server"], parsed["region"],
                parsed.get("zone_id"), parsed.get("boss_id"))
            if not results:
                return jsonify(error="No kills found for that character/boss."), 404
            report_code, fight = results[0]
            player_name = player_name or char_name

        else:  # report
            report_code = parsed["code"]
            fight_id = parsed.get("fight_id")
            fights = fetch_fights(token, report_code)
            if not fights:
                return jsonify(error="No kill fights found in this report."), 404
            if fight_id:
                fight = next((f for f in fights if f["id"] == fight_id), fights[0])
            else:
                fight = fights[0]
            if not player_name:
                return jsonify(error="Paste a character URL, or add ?player=Name for report URLs."), 400

        actors, abilities = fetch_master(token, report_code)

        lookup = player_name.lower()
        source_id = actors.get(lookup)
        if source_id is None:
            available = ", ".join(actors.keys())
            return jsonify(error=f"Player '{player_name}' not in report. Players: {available}"), 404

        casts = fetch_casts(token, report_code, fight["id"], source_id)
        fight_start = fight["startTime"]
        duration_ms = fight["endTime"] - fight["startTime"]

        rotation = [
            {"n": i + 1,
             "time": fmt_ms(c["timestamp"] - fight_start),
             "ability": abilities.get(c.get("abilityGameID", 0), f"Unknown ({c.get('abilityGameID',0)})")}
            for i, c in enumerate(casts)
        ]

        return jsonify(
            fight=fight["name"],
            duration=fmt_ms(duration_ms),
            report_url=f"https://www.fflogs.com/reports/{report_code}#fight={fight['id']}",
            player=player_name,
            rotation=rotation,
        )

    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:
        return jsonify(error=f"API error: {e}"), 500


# ── Frontend ───────────────────────────────────────────────────────────────────

HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FFLogs Rotation Viewer</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:      #0d0f14;
    --surface: #161921;
    --border:  #2a2d3a;
    --accent:  #c9a227;
    --text:    #e2e4ec;
    --muted:   #6b7080;
    --red:     #e05a5a;
    --green:   #5ae0a0;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Segoe UI', system-ui, sans-serif;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem 4rem;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }
  header h1 {
    font-size: 1.8rem;
    color: var(--accent);
    letter-spacing: .05em;
  }
  header p { color: var(--muted); font-size: .9rem; margin-top: .3rem; }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.5rem;
    width: 100%;
    max-width: 760px;
  }

  .input-row {
    display: flex;
    gap: .6rem;
    flex-wrap: wrap;
  }

  input[type=text] {
    flex: 1;
    min-width: 0;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: .95rem;
    padding: .6rem .9rem;
    outline: none;
    transition: border-color .15s;
  }
  input[type=text]:focus { border-color: var(--accent); }
  input[type=text]::placeholder { color: var(--muted); }

  button {
    background: var(--accent);
    border: none;
    border-radius: 6px;
    color: #0d0f14;
    cursor: pointer;
    font-size: .95rem;
    font-weight: 700;
    padding: .6rem 1.4rem;
    transition: opacity .15s;
    white-space: nowrap;
  }
  button:disabled { opacity: .4; cursor: default; }
  button:not(:disabled):hover { opacity: .85; }

  .hint { color: var(--muted); font-size: .8rem; margin-top: .6rem; }

  #error {
    display: none;
    background: #2a1212;
    border: 1px solid var(--red);
    border-radius: 6px;
    color: var(--red);
    font-size: .9rem;
    margin-top: 1rem;
    padding: .7rem 1rem;
  }

  #meta {
    display: none;
    margin-top: 1.4rem;
    border-top: 1px solid var(--border);
    padding-top: 1.2rem;
  }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: .5rem 1.5rem;
    font-size: .88rem;
    color: var(--muted);
    margin-bottom: 1rem;
  }
  .meta-row span b { color: var(--text); }
  .meta-row a { color: var(--accent); text-decoration: none; }
  .meta-row a:hover { text-decoration: underline; }

  .filter-row {
    display: flex;
    gap: .5rem;
    margin-bottom: .8rem;
    flex-wrap: wrap;
  }
  .filter-btn {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 20px;
    color: var(--muted);
    cursor: pointer;
    font-size: .8rem;
    font-weight: 600;
    padding: .3rem .85rem;
    transition: all .15s;
  }
  .filter-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #0d0f14;
  }
  .filter-btn:hover:not(.active) { border-color: var(--accent); color: var(--accent); }

  #search-input {
    flex: 1;
    min-width: 120px;
    font-size: .8rem;
    padding: .3rem .7rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: .88rem;
  }
  thead th {
    color: var(--muted);
    font-size: .75rem;
    font-weight: 600;
    letter-spacing: .06em;
    padding: .4rem .6rem;
    text-align: left;
    text-transform: uppercase;
    border-bottom: 1px solid var(--border);
  }
  tbody tr:hover { background: rgba(255,255,255,.03); }
  tbody td {
    padding: .35rem .6rem;
    border-bottom: 1px solid rgba(255,255,255,.04);
  }
  .col-n  { color: var(--muted); width: 3.5rem; text-align: right; }
  .col-t  { color: var(--accent); width: 4.5rem; font-variant-numeric: tabular-nums; }
  .col-ab { }

  .badge {
    display: inline-block;
    border-radius: 4px;
    font-size: .7rem;
    font-weight: 700;
    letter-spacing: .04em;
    margin-left: .4rem;
    padding: .05rem .4rem;
    vertical-align: middle;
    text-transform: uppercase;
  }
  .badge-gcd  { background: #1a3a4a; color: #6ac8f0; }
  .badge-ogcd { background: #2a1f3a; color: #b08af0; }
  .badge-buff { background: #1a3020; color: var(--green); }

  .count-label {
    color: var(--muted);
    font-size: .8rem;
    margin-top: .6rem;
    text-align: right;
  }

  .spinner {
    display: none;
    color: var(--muted);
    font-size: .9rem;
    margin-top: 1rem;
    text-align: center;
  }
</style>
</head>
<body>

<header>
  <h1>FFLogs Rotation Viewer</h1>
  <p>Paste a character or report URL to see the cast sequence</p>
</header>

<div class="card">
  <div class="input-row">
    <input id="url-input" type="text"
      placeholder="https://www.fflogs.com/character/eu/cerberus/Chayo Kyota?zone=76&boss=1085">
    <button id="go-btn" onclick="fetchRotation()">Pull Rotation</button>
  </div>
  <p class="hint">
    Supports character URLs (<code>/character/region/server/name?zone=X&boss=Y</code>)
    and report URLs (<code>/reports/CODE#fight=N</code>).
  </p>

  <div id="error"></div>
  <div class="spinner" id="spinner">Fetching rotation&hellip;</div>

  <div id="meta">
    <div class="meta-row" id="meta-info"></div>

    <div class="filter-row">
      <button class="filter-btn active" data-filter="all" onclick="setFilter(this)">All</button>
      <button class="filter-btn" data-filter="gcd"  onclick="setFilter(this)">GCDs</button>
      <button class="filter-btn" data-filter="ogcd" onclick="setFilter(this)">oGCDs</button>
      <input id="search-input" type="text" placeholder="Search ability…" oninput="renderTable()">
    </div>

    <table id="rotation-table">
      <thead>
        <tr>
          <th class="col-n">#</th>
          <th class="col-t">Time</th>
          <th class="col-ab">Ability</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>
    <div class="count-label" id="count-label"></div>
  </div>
</div>

<script>
// Ability classification heuristics for RDM (extend as needed)
const GCD_ABILITIES = new Set([
  "Veraero III","Verthunder III","Veraero II","Verthunder II","Veraero","Verthunder",
  "Jolt III","Jolt II","Jolt","Impact","Scatter","Grand Impact",
  "Verstone","Verfire","Verholy","Verflare","Scorch","Resolution","Vercure","Verraise",
  "Enchanted Riposte","Enchanted Zwerchhau","Enchanted Redoublement",
  "Enchanted Moulinet","Enchanted Moulinet Deux","Enchanted Moulinet Trois",
  "Enchanted Reprise","Vice of Thorns","Prefulgence",
  // Generic catch-all GCDs by keyword
]);

const BUFF_ABILITIES = new Set([
  "Embolden","Manafication","Acceleration","Swiftcast","Addle","Magick Barrier",
  "Lucid Dreaming","Sprint","Vercure",
  "Grade 4 Gemdraught of Intelligence [HQ]",
  "Grade 8 Tincture of Intelligence",
  "Corps-a-Corps","Engagement","Fleche","Contre Sixte",
]);

function classify(name) {
  if (GCD_ABILITIES.has(name)) return "gcd";
  if (BUFF_ABILITIES.has(name)) return "ogcd";
  // Fallback: names with "Enchanted" or known GCD patterns
  if (/enchanted|verstone|verfire|verholy|verflare|scorch|resolution|jolt|impact/i.test(name)) return "gcd";
  return "ogcd";
}

let allCasts = [];
let activeFilter = "all";

function setFilter(btn) {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeFilter = btn.dataset.filter;
  renderTable();
}

function renderTable() {
  const search = document.getElementById("search-input").value.toLowerCase();
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  let shown = 0;
  for (const cast of allCasts) {
    const cls = classify(cast.ability);
    if (activeFilter !== "all" && cls !== activeFilter) continue;
    if (search && !cast.ability.toLowerCase().includes(search)) continue;

    shown++;
    const tr = document.createElement("tr");
    const badge = cls === "gcd"
      ? '<span class="badge badge-gcd">GCD</span>'
      : '<span class="badge badge-ogcd">oGCD</span>';
    tr.innerHTML = `
      <td class="col-n">${cast.n}</td>
      <td class="col-t">${cast.time}</td>
      <td class="col-ab">${escHtml(cast.ability)}${badge}</td>`;
    tbody.appendChild(tr);
  }

  document.getElementById("count-label").textContent =
    `Showing ${shown} of ${allCasts.length} casts`;
}

function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function showError(msg) {
  const el = document.getElementById("error");
  el.textContent = msg;
  el.style.display = "block";
}

async function fetchRotation() {
  const url = document.getElementById("url-input").value.trim();
  if (!url) return;

  document.getElementById("error").style.display = "none";
  document.getElementById("meta").style.display = "none";
  document.getElementById("spinner").style.display = "block";
  document.getElementById("go-btn").disabled = true;

  try {
    const res = await fetch("/api/rotation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || "Unknown error");
      return;
    }

    allCasts = data.rotation;
    document.getElementById("meta-info").innerHTML = `
      <span><b>${escHtml(data.fight)}</b></span>
      <span>Duration: <b>${data.duration}</b></span>
      <span>Player: <b>${escHtml(data.player)}</b></span>
      <span><a href="${data.report_url}" target="_blank">Open in FFLogs ↗</a></span>
    `;
    document.getElementById("meta").style.display = "block";
    document.getElementById("search-input").value = "";
    activeFilter = "all";
    document.querySelectorAll(".filter-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.filter === "all"));
    renderTable();

  } catch(e) {
    showError("Network error: " + e.message);
  } finally {
    document.getElementById("spinner").style.display = "none";
    document.getElementById("go-btn").disabled = false;
  }
}

document.getElementById("url-input").addEventListener("keydown", e => {
  if (e.key === "Enter") fetchRotation();
});
</script>
</body>
</html>
"""

@app.get("/")
def index():
    return render_template_string(HTML)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
