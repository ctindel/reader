

#
# Copyright (c) 2008 - 2013 10gen, Inc. <http://10gen.com>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
#
import hmac
import random
import string
import hashlib
import pymongo

from flask.ext.login import UserMixin, AnonymousUser
import Blog

class User(UserMixin):
    def __init__(self, db, user_map):
        print user_map
        self.user_map = user_map
        self.user_id = user_map['_id']
        self.email = user_map['email']
        self.full_name = user_map['full_name']
        self.active = user_map['active']
        self.subs = user_map['subs']

    def is_active(self):
        return self.active

    # This needs to return the email address for flask-login to work properly
    def get_id(self):
        return self.user_map['email']

    def get_user_id(self):
        return self.user_id

    def get_email(self):
        return unicode(self.email)

    def get_full_name(self):
        return self.full_name

    def get_subs(self):
        return self.subs

    def get_blogs(self, load_entries):
        return Blog.get_user_blogs(self, load_entries)

# The User Data Access Object handles all interactions with the User collection.
class UserDAO:

    def __init__(self, db):
        self.db = db
        self.user = self.db.user
        self.SECRET = 'verysecret'

    # makes a little salt
    def make_salt(self):
        salt = ""
        for i in range(5):
            salt = salt + random.choice(string.ascii_letters)
        return salt

    # implement the function make_pw_hash(name, pw) that returns a hashed password
    # of the format:
    # HASH(pw + salt),salt
    # use sha256

    def make_pw_hash(self, pw,salt=None):
        if salt == None:
            salt = self.make_salt();
        return hashlib.sha256(pw + salt).hexdigest()+","+ salt

    def load_user(self, email):
        user = None
        try:
            user_map = self.user.find_one({'email' : email})
            user = User(self.db, user_map)
        except:
            print "Unable to query database for user"

        return user

    # Validates a user login. Returns user record or None
    def validate_login(self, email, password):

        user = None
        try:
            user_map = self.user.find_one({'email' : email})
            user = User(self.db, user_map)
        except:
            print "Unable to query database for user"

        if user is None:
            print "User not in database"
            return None

        salt = user_map['password'].split(',')[1]

        if user_map['password'] != self.make_pw_hash(password, salt):
            print "user password is not a match"
            return None

        # Looks good
        return user

    # creates a new user in the users collection
    def add_user(self, email, full_name, password):
        password_hash = self.make_pw_hash(password)

        user = {'email' : email, 'full_name' : full_name, 
                'password': password_hash, 'active' : True, 'subs' : []}

        try:
            self.user.save(user)
        except pymongo.errors.OperationFailure:
            print "oops, mongo error"
            return False
        except pymongo.errors.DuplicateKeyError as e:
            print "oops, email is already taken"
            return False

        return True


