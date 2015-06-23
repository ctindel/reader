#!/usr/bin/python

import Feed

for f in Feed.getNewFeeds():
    f.reload()    
    Feed.printFeed(f)
    f.save()

for f in Feed.getActiveFeeds():
    f.reload()
    Feed.printFeed(f)
    f.save()

# !!! Once a day or so we should poll inactive feeds to make sure
# nothing has changed
for f in Feed.getInactiveFeeds():
    f.reload()
    Feed.printFeed(f)
    f.save()
