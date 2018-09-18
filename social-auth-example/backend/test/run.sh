#!/bin/bash

export NODE_ENV=development

node setup_tests.js
jasmine-node create_accounts_error_spec.js
#jasmine-node create_accounts_spec.js
