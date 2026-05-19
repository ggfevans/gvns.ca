#!/usr/bin/env bash
set -euo pipefail

# build-json.sh
# Assembles the final JSON output from intermediate files.
# No network calls - purely data transformation.
#
# Required env vars:
#   TRAKT_OUTPUT_PATH - Path to write the final JSON file
#   TRAKT_TMPDIR      - Temporary directory containing intermediate files

: "${TRAKT_OUTPUT_PATH:?must be set}"
: "${TRAKT_TMPDIR:?must be set}"

# shellcheck source=validate-inputs.sh
source "$(dirname "$0")/validate-inputs.sh"
validate_output_path "$TRAKT_OUTPUT_PATH"

mkdir -p "$(dirname "$TRAKT_OUTPUT_PATH")"

if [ ! -f "$TRAKT_TMPDIR/history.json" ]; then
  echo "Error: history.json not found in TRAKT_TMPDIR" >&2
  exit 1
fi

if [ ! -f "$TRAKT_TMPDIR/posters.json" ]; then
  echo '{}' > "$TRAKT_TMPDIR/posters.json"
fi

echo "Building final JSON output at ${TRAKT_OUTPUT_PATH}"

CURRENT_MONTH=$(date -u +%Y-%m)

jq --slurpfile posters "$TRAKT_TMPDIR/posters.json" \
   --arg month "$CURRENT_MONTH" '
  ($posters[0] // {}) as $poster_map |

  sort_by(
    if .type == "movie" then "movie_" + (.movie.ids.trakt | tostring)
    elif .type == "episode" then "show_" + (.show.ids.trakt | tostring)
    else "unknown" end
  ) |
  group_by(
    if .type == "movie" then "movie_" + (.movie.ids.trakt | tostring)
    elif .type == "episode" then "show_" + (.show.ids.trakt | tostring)
    else "unknown" end
  ) | map(sort_by(.watched_at) | reverse | first) |

  sort_by(.watched_at) | reverse |

  ([ .[] | select(.watched_at | startswith($month)) ] |
    { movies: [ .[] | select(.type == "movie") ] | length,
      shows: [ .[] | select(.type == "episode") ] | length }) as $month_stats |

  {
    lastUpdated: (now | todate),
    recentlyWatched: [
      .[] |
      if .type == "movie" then
        {
          title: .movie.title,
          type: "movie",
          posterUrl: ($poster_map["movie_" + (.movie.ids.tmdb | tostring)] // null),
          url: ("https://trakt.tv/movies/" + .movie.ids.slug),
          watchedDate: .watched_at
        }
      elif .type == "episode" then
        {
          title: (.show.title + " \u2014 S" + (
            if .episode.season < 10 then "0" else "" end
          ) + (.episode.season | tostring) + "E" + (
            if .episode.number < 10 then "0" else "" end
          ) + (.episode.number | tostring)),
          type: "show",
          posterUrl: ($poster_map["tv_" + (.show.ids.tmdb | tostring)] // null),
          url: ("https://trakt.tv/shows/" + .show.ids.slug),
          watchedDate: .watched_at
        }
      else empty end
    ],
    stats: {
      moviesThisMonth: $month_stats.movies,
      showsThisMonth: $month_stats.shows
    }
  }
' "$TRAKT_TMPDIR/history.json" > "$TRAKT_OUTPUT_PATH"

echo "Successfully built watching.json"
jq '{
  recently_watched: (.recentlyWatched | length),
  movies_this_month: .stats.moviesThisMonth,
  shows_this_month: .stats.showsThisMonth
}' "$TRAKT_OUTPUT_PATH"

echo "build-json.sh completed successfully"
