import requests
import json
import time

for i in range(100):
    req = requests.get("https://api.wheretheiss.at/v1/satellites/25544")
    data = req.json()
    print(data)
    req = requests.get("http://api.open-notify.org/iss-now.json")
    data = req.json()
    print(data)
    print("\n\n ************** \n\n")
    time.sleep(5)
    

