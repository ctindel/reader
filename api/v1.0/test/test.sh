#!/bin/bash

export SP_API_KEY_ID="1CHXK0H6LD39SAOSXF24PA7VX"
export SP_API_KEY_SECRET="6oWF/C/2vTbtfNi6RtCedXGDmUu6cfCSPIqNpngPSZY"
export SP_APP_ID="20kXtS2Y97gpaWRECfyXVD"

curl -u $SP_API_KEY_ID:$SP_API_KEY_SECRET "https://api.stormpath.com/v1/applications/$SP_APP_ID/accounts?email=testuser@example.com"

# ACCOUNT CREATION
# Test missing parameters
curl -X PUT localhost:8080/api/v1.0/user/enroll
curl -X PUT localhost:8080/api/v1.0/user/enroll -d first_name=Test
curl -X PUT -d first_name=Test -d last_name=User localhost:8080/api/v1.0/user/enroll
curl -X PUT -d first_name=Test -d last_name=User -d email=testuser@example.com localhost:8080/api/v1.0/user/enroll
# Password too short
curl -X PUT -d first_name=Test -d last_name=User -d email=testuser@example.com -d password=testu localhost:8080/api/v1.0/user/enroll
# Password missing number
curl -X PUT -d first_name=Test -d last_name=User -d email=testuser@example.com -d password=testuserasdf localhost:8080/api/v1.0/user/enroll
# Password missing uppercase character
curl -X PUT -d first_name=Test -d last_name=User -d email=testuser@example.com -d password=testuser123 localhost:8080/api/v1.0/user/enroll
curl -X PUT -d first_name=Test -d last_name=User -d email=testuser@example.com -d password=testUser123 localhost:8080/api/v1.0/user/enroll
