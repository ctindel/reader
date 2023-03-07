#!/bin/bash

function killport() { 
    lsof -i TCP:$1 | grep LISTEN | awk '{print $2}' | xargs kill -9 
}

# Stop any currently running processes from previous invocations
killport "3000"
killport "9000"
kill -2 `pgrep mongod` > /dev/null 2>&1

# Open iTerm2 and create five new full-window tabs
osascript <<END_SCRIPT
  tell application "iTerm"
    activate
    set newWindow to (create window with default profile)
    set bounds of newWindow to {0, 0, 800, 1024}
    repeat 4 times
      tell newWindow
        set newTab to (create tab with default profile)
        tell newTab
          set fullscreen to true
        end tell
      end tell
    end repeat
    tell current session of newWindow
      set fullscreen to true
    end tell
  end tell
END_SCRIPT

# Start mongod in first tab
osascript <<END_SCRIPT
  tell application "iTerm"
    tell current session of tab 1 of window 1
      write text "cd ~/src/reader/server && npm run startmongo"
    end tell
  end tell
END_SCRIPT

until nc -z localhost 27017
do
    sleep 1
done

# Start mongosh in second tab
osascript <<END_SCRIPT
  tell application "iTerm"
    tell current session of tab 2 of window 1
      write text "~/mongo/mongosh-1.6.1-darwin-x64/bin/mongosh reader"
    end tell
  end tell
END_SCRIPT

# Start express application in third tab
osascript <<END_SCRIPT
  tell application "iTerm"
    tell current session of tab 3 of window 1
      write text "cd ~/src/reader/server && npm run server"
    end tell
  end tell
END_SCRIPT

# Start react application in fourth tab
osascript <<END_SCRIPT
  tell application "iTerm"
    tell current session of tab 4 of window 1
      write text "cd ~/src/reader/www-react-mui && npm run start"
    end tell
  end tell
END_SCRIPT

# Start shell in fifth tab
osascript <<END_SCRIPT
  tell application "iTerm"
    tell current session of tab 5 of window 1
      write text "cd ~/src/reader/server && ls"
    end tell
  end tell
END_SCRIPT

sleep 3

# Re-open iTerm after the react app brings the browser to focus
osascript <<END_SCRIPT
  tell application "iTerm"
    activate
  end tell
END_SCRIPT

# Open Visual Studio Code
osascript <<END_SCRIPT
  tell application "Visual Studio Code"
    activate
  end tell
END_SCRIPT
