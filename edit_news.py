import json
import os
import sys
from pathlib import Path
from urllib import request

github_repo = os.getenv("GITHUB_REPOSITORY")

try:
    with request.urlopen(f"https://raw.githubusercontent.com/{github_repo}/main/news.json") as f:
        news = json.load(f)
except OSError:
    news = []

action = (sys.argv[1:2] or [input("Action (add/delete): ")])[0]
if action == "add":
    news.append({
        "title": sys.argv[2],
        "content": sys.argv[3],
    })
    print(f"Added news with index {len(news) - 1}: {news[-1]}")
elif action == "delete":
    for i, n in enumerate(news):
        if n["title"] == sys.argv[2]:
            print(f"Deleted news with index {i}: {news[i]}")
            del news[i]
            break
    else:
        print("Cound not find news to delete")
else:
    raise ValueError(f"Invalid action: {action}")

Path("news.json").write_text(json.dumps(news))
