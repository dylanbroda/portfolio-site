"""Refresh follower counts for the accounts_scaled table.

Run daily by .github/workflows/followers.yml. Fetches public profile data
through Apify's instagram-profile-scraper and rewrites data/accounts.json,
which the site reads on load. Pure ASCII and stdlib only.

Fails loudly (non-zero exit) rather than writing bad data: a missing token,
an API error, or zero usable results all leave the existing file untouched.
"""
import datetime
import json
import os
import sys
import urllib.request

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "accounts.json")
ACTOR_URL = (
    "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/"
    "run-sync-get-dataset-items?timeout=240"
)
# A drop this large in one day is far more likely a bad scrape than real loss.
MAX_DAILY_DROP = 0.5


def fetch_counts(handles, token):
    body = json.dumps({"usernames": handles}).encode("utf-8")
    req = urllib.request.Request(
        ACTOR_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            # urllib's default UA gets blocked by some Cloudflare-fronted APIs.
            "User-Agent": "Mozilla/5.0 (portfolio-follower-sync)",
        },
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        items = json.load(resp)
    counts = {}
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        name = str(item.get("username") or "").lower()
        followers = item.get("followersCount")
        if name and isinstance(followers, int) and followers >= 0:
            counts[name] = followers
    return counts


def merge(data, counts, now):
    """Apply fresh counts onto existing data. Returns (changed, problems)."""
    changed, problems = [], []
    for handle, entry in data["accounts"].items():
        new = counts.get(handle.lower())
        old = entry.get("followers")
        if new is None:
            problems.append(handle + ": not returned by Apify (kept previous value)")
            continue
        if isinstance(old, int) and old > 0 and new < old * (1 - MAX_DAILY_DROP):
            problems.append(
                "%s: %d -> %d looks like a bad scrape (kept previous value)" % (handle, old, new)
            )
            continue
        if new != old:
            entry["followers"] = new
            changed.append("%s: %s -> %d" % (handle, old, new))
    if changed:
        data["updated"] = now
    return changed, problems


def main():
    token = os.environ.get("APIFY_TOKEN", "").strip()
    if not token:
        print("ERROR: APIFY_TOKEN is not set", file=sys.stderr)
        return 1
    with open(DATA_FILE) as f:
        data = json.load(f)
    handles = list(data["accounts"].keys())
    try:
        counts = fetch_counts(handles, token)
    except Exception as exc:  # network, HTTP or JSON failure
        print("ERROR: Apify request failed: %s" % exc, file=sys.stderr)
        return 1
    if not counts:
        print("ERROR: Apify returned no usable profiles", file=sys.stderr)
        return 1
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    changed, problems = merge(data, counts, now)
    for line in problems:
        print("WARN: " + line)
    for line in changed:
        print("updated " + line)
    if changed:
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
    else:
        print("no changes")
    # Every handle failing is an outage worth surfacing, not a quiet day.
    return 1 if len(problems) == len(handles) else 0


if __name__ == "__main__":
    sys.exit(main())
