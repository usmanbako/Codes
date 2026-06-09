#!/usr/bin/env python3
"""
FFLogs Rotation Puller
Fetches the cast sequence for a character in a specific zone/boss encounter.
"""

import sys
import requests
from datetime import datetime

CLIENT_ID = "a1fc18de-df88-4531-803b-07b66551481b"
CLIENT_SECRET = "YnMekuH37idlySEJdFbhdNGGBFaGWrvKTCLESmeM"

TOKEN_URL = "https://www.fflogs.com/oauth/token"
API_URL = "https://www.fflogs.com/api/v2/client"

CHARACTER_NAME = "Chayo Kyota"
SERVER_SLUG = "Cerberus"
SERVER_REGION = "EU"
ZONE_ID = 76
BOSS_ID = 1085


def get_token():
    resp = requests.post(
        TOKEN_URL,
        data={"grant_type": "client_credentials"},
        auth=(CLIENT_ID, CLIENT_SECRET),
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def gql(token, query, variables=None):
    resp = requests.post(
        API_URL,
        json={"query": query, "variables": variables or {}},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        for e in data["errors"]:
            print(f"[GQL error] {e['message']}", file=sys.stderr)
        sys.exit(1)
    return data["data"]


# ── Queries ────────────────────────────────────────────────────────────────────

CHARACTER_REPORTS_QUERY = """
query CharacterReports($name: String!, $serverSlug: String!, $serverRegion: String!) {
  characterData {
    character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
      id
      name
      recentReports(limit: 10) {
        data {
          code
          title
          startTime
          fights(killType: Kills) {
            id
            name
            encounterID
            startTime
            endTime
          }
        }
      }
    }
  }
}
"""

CAST_EVENTS_QUERY = """
query CastEvents($code: String!, $fightIDs: [Int]!, $sourceID: Int!) {
  reportData {
    report(code: $code) {
      events(
        fightIDs: $fightIDs
        sourceID: $sourceID
        dataType: Casts
        limit: 10000
      ) {
        data
        nextPageTimestamp
      }
    }
  }
}
"""

ACTORS_QUERY = """
query Actors($code: String!) {
  reportData {
    report(code: $code) {
      masterData {
        actors(type: "Player") {
          id
          name
        }
        abilities {
          gameID
          name
          type
        }
      }
    }
  }
}
"""


def fmt_ms(ms):
    s = ms / 1000
    m, s = divmod(int(s), 60)
    return f"{m:02d}:{s:02d}"


def pull_rotation(token, report_code, fight, source_id, ability_map):
    fight_duration = fight["endTime"] - fight["startTime"]
    pages = []
    next_ts = None

    while True:
        q = """
query CastEvents($code: String!, $fightIDs: [Int]!, $sourceID: Int!, $startTime: Float) {
  reportData {
    report(code: $code) {
      events(
        fightIDs: $fightIDs
        sourceID: $sourceID
        dataType: Casts
        limit: 10000
        startTime: $startTime
      ) {
        data
        nextPageTimestamp
      }
    }
  }
}
"""
        data = gql(token, q, {
            "code": report_code,
            "fightIDs": [fight["id"]],
            "sourceID": source_id,
            "startTime": next_ts,
        })
        events_page = data["reportData"]["report"]["events"]
        pages.extend(events_page["data"])
        next_ts = events_page["nextPageTimestamp"]
        if not next_ts:
            break

    # Filter to "cast" completions only (type 1 = begincast, type 0 = cast/finish varies by game)
    # FFLogs FFXIV: "begincast" and "cast" events. We want completed casts.
    casts = [e for e in pages if e.get("type") == "cast"]

    fight_start = fight["startTime"]
    print(f"\n{'─'*60}")
    print(f"  {fight['name']}  ({fmt_ms(fight_duration)} kill)")
    print(f"  Report: https://www.fflogs.com/reports/{report_code}#fight={fight['id']}")
    print(f"{'─'*60}")
    print(f"  {'#':>4}  {'Time':>6}  Ability")
    print(f"{'─'*60}")

    for i, cast in enumerate(casts, 1):
        t = cast["timestamp"] - fight_start
        ability_id = cast.get("abilityGameID", 0)
        name = ability_map.get(ability_id, f"Unknown ({ability_id})")
        print(f"  {i:>4}  {fmt_ms(t):>6}  {name}")

    print(f"{'─'*60}")
    print(f"  Total casts: {len(casts)}")


def main():
    print("Authenticating with FFLogs...")
    token = get_token()

    print(f"Fetching reports for {CHARACTER_NAME} @ {SERVER_SLUG} ({SERVER_REGION})...")
    data = gql(token, CHARACTER_REPORTS_QUERY, {
        "name": CHARACTER_NAME,
        "serverSlug": SERVER_SLUG,
        "serverRegion": SERVER_REGION,
    })

    char = data["characterData"]["character"]
    if not char:
        print("Character not found.")
        sys.exit(1)

    char_id = char["id"]
    reports = char["recentReports"]["data"]

    # Collect reports that have kills on our target boss
    target_fights = []
    for report in reports:
        for fight in report.get("fights") or []:
            if fight["encounterID"] == BOSS_ID:
                target_fights.append((report["code"], fight))

    if not target_fights:
        print(f"No kill logs found for boss {BOSS_ID} in zone {ZONE_ID}.")
        sys.exit(1)

    # Use the most recent kill
    report_code, fight = target_fights[0]
    print(f"Found kill in report {report_code}: {fight['name']}")

    # Get actors + abilities for this report
    print("Fetching actors and ability names...")
    master = gql(token, ACTORS_QUERY, {"code": report_code})
    master_data = master["reportData"]["report"]["masterData"]

    actors = master_data["actors"]
    ability_map = {a["gameID"]: a["name"] for a in master_data["abilities"]}

    # Find the player's source ID in this report
    source_id = None
    for actor in actors:
        if actor["name"].lower() == CHARACTER_NAME.lower():
            source_id = actor["id"]
            break

    if source_id is None:
        print(f"Player '{CHARACTER_NAME}' not found among actors in report {report_code}.")
        print("Players in report:", [a["name"] for a in actors])
        sys.exit(1)

    print(f"Player source ID: {source_id}")
    print("Pulling cast rotation...")

    pull_rotation(token, report_code, fight, source_id, ability_map)


if __name__ == "__main__":
    main()
