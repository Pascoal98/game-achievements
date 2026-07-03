import os
import requests
from dotenv import load_dotenv

load_dotenv()
STEAM_KEY = os.getenv("STEAM_API_KEY")
STEAM_ID = os.getenv("STEAM_ID")

def get_owned_games():
    """Fetches the user's entire Steam library and playtimes."""
    url = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/"
    params = {
        "key": STEAM_KEY,
        "steamid": STEAM_ID,
        "include_appinfo": True, # Gets the actual game names, not just IDs
        "include_played_free_games": True
    }
    
    print("Fetching game library...")
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        games = data.get("response", {}).get("games", [])
        print(f"Success! Found {len(games)} games.\n")
        
        # Sort games by playtime (highest first)
        games.sort(key=lambda x: x.get("playtime_forever", 0), reverse=True)
        return games
    else:
        print(f"Failed to fetch games. Error code: {response.status_code}")
        return []

def get_game_achievements(app_id, game_name):
    """Fetches achievement stats for a specific game."""
    url = "http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/"
    params = {
        "appid": app_id,
        "key": STEAM_KEY,
        "steamid": STEAM_ID
    }
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        achievements = data.get("playerstats", {}).get("achievements", [])
        
        # Count how many are unlocked (achieved == 1)
        unlocked = [a for a in achievements if a.get("achieved") == 1]
        
        print(f"[{game_name}]")
        print(f"Achievements: {len(unlocked)} / {len(achievements)} unlocked\n")
    elif response.status_code == 400:
        # Steam throws a 400 error if the game doesn't have achievements at all
        print(f"[{game_name}]\nNo achievements exist for this game.\n")
    else:
        print(f"[{game_name}]\nFailed to fetch achievements (Profile might be private).\n")

if __name__ == "__main__":
    my_games = get_owned_games()
    
    if my_games:
        print("Top 3 Most Played Games:")
        # Loop through just the top 3 games to avoid spamming the API
        for game in my_games[:3]:
            name = game.get("name")
            app_id = game.get("appid")
            playtime_hours = round(game.get("playtime_forever", 0) / 60, 1)
            
            print(f"- {name} ({playtime_hours} hours)")
            
        print("\nFetching achievements for your most played game...")
        top_game = my_games[0]
        get_game_achievements(top_game["appid"], top_game["name"])