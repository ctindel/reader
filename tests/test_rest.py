#!/usr/bin/python

import requests, json

READER_URL = "http://localhost:5000/api/v1"
API_KEY = 'mwkMqTWFnK0LzJHyfkeBGoS2hr2KG7WhHqSGX0SbDJ4'

params = {'apikey':'mwkMqTWFnK0LzJHyfkeBGoS2hr2KG7WhHqSGX0SbDJ4'}

#r = requests.get(READER_URL + '/feeds', params=params)
#print(r.text)

#r = requests.get(READER_URL + '/feeds/entries', params=params)
#print(r.text)

#r = requests.get(READER_URL + '/feeds/123/entries', params=params)
#print(r.text)

#r = requests.get(READER_URL + '/feeds/522887e6867494d2e1bde7ee/entries', params=params)
#print(r.text)

params['read'] = 'true'
r = requests.put(READER_URL + '/feeds/522887e6867494d2e1bde7ee/entries/5400bc8c22ddb0aceaed54ba', params=params)
print(r.text)
