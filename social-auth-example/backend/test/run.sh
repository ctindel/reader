#!/bin/bash

export NODE_ENV=development

node setup_tests.js
if [ $? -ne 0 ]; then
    echo "Error doing setup tests, can't continue"
fi
# jasmine-node create_accounts_error_spec.js
jasmine-node create_accounts_spec.js
jasmine-node subscribe_spec.js
