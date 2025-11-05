#!/bin/bash

# Test profile update with the exact data from the user's request
curl -X PUT 'http://localhost:5001/api/auth/profile' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDVkNDdlZGYyZTczMmVhYjVhODMxMSIsImlhdCI6MTc2MTk5Mzg5MSwiZXhwIjoxNzYyNTk4NjkxfQ.4qgT-PU-r6hE6jwnHED3UQvHPlJfBrGXNdZWIQEEPhs' \
  --data-raw '{"name":"ManiKumar Navara","phone":"+919030090216","location":"Narsipatnam","photo":""}' \
  -w "\n\nHTTP Status: %{http_code}\n"
