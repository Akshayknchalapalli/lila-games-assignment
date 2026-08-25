from pathlib import Path

FIXTURES = Path(__file__).resolve().parent / "fixtures"
CANONICAL_MAP_CONFIG = (
    Path(__file__).resolve().parents[2]
    / "specs"
    / "001-player-journey-viz"
    / "contracts"
    / "map-config.json"
)
EVENT_KINDS = (
    "Position",
    "BotPosition",
    "Kill",
    "Killed",
    "BotKill",
    "BotKilled",
    "KilledByStorm",
    "Loot",
)
HUMAN_UUID = "f4e072fa-b7af-4761-b567-1d95b7ad0108"
BOT_ID = "1440"
MATCH_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.nakama-0"
MATCH_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.nakama-0"
