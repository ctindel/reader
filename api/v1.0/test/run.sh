#!/bin/bash

node setup_tests.js
jasmine-node create_accounts_error_spec.js
jasmine-node create_accounts_spec.js
node write_creds.js
jasmine-node subscribe_spec.js
jasmine-node feed_err_spec.js
jasmine-node feed_spec.js
jasmine-node feed_entry_read_spec.js
jasmine-node feed_read_spec.js
jasmine-node feed_entry_unread_spec.js
