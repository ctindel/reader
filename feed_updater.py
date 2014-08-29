#!/usr/bin/python

import Blog

blogs = Blog.get_all_blogs()
for b in blogs:
    b.reload()
    b.save()
