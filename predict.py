import requests
import json
url = 'http://localhost:8501/v1/models/boston_model:predict'

data = json.dumps({"signature_name": "serving_default", "instances": [[0.09178, 0.0, 4.05, 0.0, 0.51, 6.416, 84.1, 2.6463, 5.0, 296.0, 16.6, 395.5, 9.04]]})
headers = {"content-type": "application/json"}
resp = requests.post(url, data = data, headers = headers)
pred = json.loads(resp.text)['predictions']
print(pred)
