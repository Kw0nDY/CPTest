import requests

API_URL = "http://220.118.23.185:3000/api/v1/vector/upsert/9e85772e-dc56-4b4d-bb00-e18aeb80a484"

# use form data to upload files
form_data = {
    "files": ('example.csv', open('example.csv', 'rb'))
}
body_data = {
    "columnName": "example",
    "metadata": { "key": "val" },
    "omitMetadataKeys": "example",
}

def query(form_data, body_data):
    response = requests.post(API_URL, files=form_data, data=body_data)
    return response.json()

output = query(form_data, body_data)