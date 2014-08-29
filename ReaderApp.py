#!/usr/bin/python

from flask import Flask, request, render_template, redirect, url_for, flash, abort
from flask.ext.login import (LoginManager, current_user, login_required,
                            login_user, logout_user, UserMixin, confirm_login, fresh_login_required)
from tools import jsonify
import pymongo
from userDAO import UserDAO
import re

# validates that the user information is valid for new signup, return True of False
# and fills in the error string if there is an issue
def validate_signup(email, full_name, password, verify):
    #USER_RE = re.compile(r"^[a-zA-Z0-9_-]{3,20}$")
    EMAIL_RE = re.compile(r"^[\S]+@[\S]+\.[\S]+$")
    FULL_NAME_RE = re.compile(r"^[\W\w-]{3,25}$")
    PASS_RE = re.compile(r"^.{3,20}$")

    if not FULL_NAME_RE.match(full_name):
        flash("invalid Full Name \"%s\". try just letters and numbers" % full_name)
        return False

    if not PASS_RE.match(password):
        flash("invalid password.")
        return False
    if password != verify:
        flash("password must match")
        return False
    if email != "":
        if not EMAIL_RE.match(email):
            flash("invalid email address")
            return False
    else:
        flash("Email address can not be empty")
        return False
    return True

app = Flask(__name__)

SECRET_KEY = "yeah, not actually a secret"
DEBUG = True

app.config.from_object(__name__)

login_manager = LoginManager()

login_manager.login_view = "login"
login_manager.login_message = u"Please log in to access this page."
login_manager.refresh_view = "reauth"

CONNECTION_STRING = "mongodb://localhost"
CTINDEL_API_KEY = 'mwkMqTWFnK0LzJHyfkeBGoS2hr2KG7WhHqSGX0SbDJ4'
connection = pymongo.MongoClient(CONNECTION_STRING)
db = connection.reader

users = UserDAO(db)

#@login_manager.user_loader
#def load_user(id):
    #return users.load_user(id)

@login_manager.request_loader
def load_user_from_request(request):

    # !!! Need to change this to actually validate a user

    return users.load_user_by_apikey(CTINDEL_API_KEY)

    # first, try to login using the api_key url arg
    #api_key = request.args.get('api_key')
    #if api_key:
        #user = User.query.filter_by(api_key=api_key).first()
        #if user:
            #return user

    # next, try to login using Basic Auth
    #api_key = request.headers.get('Authorization')
    #if api_key:
        #api_key = api_key.replace('Basic ', '', 1)
        #try:
            #api_key = base64.b64decode(api_key)
        #except TypeError:
            #pass
        #user = User.query.filter_by(api_key=api_key).first()
        #if user:
            #return user

    # finally, return None if both methods did not login the user
    return None

login_manager.setup_app(app)

@app.route("/")
def index():
    if current_user.is_authenticated() and current_user.is_active():
        return render_template("view.html")
    return render_template("index.html")

@app.route("/view")
@login_required
def view():
    return render_template("view.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST" and "email" in request.form \
                                and 'password' in request.form:
        email = request.form["email"]
        password = request.form["password"]
        user_record = users.validate_login(email, password)
        if user_record:
            remember = request.form.get("remember", "no") == "yes"
            if login_user(user_record, remember=remember):
                return redirect(request.args.get("next") or url_for("view"))
            else:
                flash("Sorry, but you could not log in.")
        else:
            flash(u"Invalid login.")
    return render_template("login.html")

@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST" and "email" in request.form \
                                and 'full_name' in request.form \
                                and 'password' in request.form:
        email = request.form["email"]
        full_name = request.form["full_name"]
        password = request.form["password"]
        verify_pw = request.form["verify_pw"]

        if validate_signup(email, full_name, password, verify_pw):
            if not users.add_user(email, full_name, password):
                # this was a duplicate
                flash("E-mail address already in use. Please choose another")
                return render_template("signup.html")
            else:
                flash("Sign-up Successful")
                return render_template("login.html")
        else:
            flash(u"Validation Failed.")
    return render_template("signup.html")


@app.route("/reauth", methods=["GET", "POST"])
@login_required
def reauth():
    if request.method == "POST":
        confirm_login()
        flash(u"Reauthenticated.")
        return redirect(request.args.get("next") or url_for("index"))
    return render_template("reauth.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Logged out.")
    return redirect(url_for("index"))

@app.route('/api/v1/feeds', methods=['GET'])
def api_get_user_feeds():
    user = users.load_user_by_apikey(request.args['apikey'])
    feeds = current_user.get_feeds_as_dict(False)
    return jsonify(feeds)

@app.route('/api/v1/feeds/entries', methods=['GET'])
def api_get_user_feed_entries():
    user = users.load_user_by_apikey(request.args['apikey'])
    feeds = current_user.get_feeds_as_dict(True)
    return jsonify(feeds)

@app.route('/api/v1/feeds/<feedid>/entries', methods=['GET'])
def api_get_user_feed_entries_by_feed(feedid):
    user = users.load_user_by_apikey(request.args['apikey'])
    feeds = current_user.get_feeds_as_dict(True)
    for f in feeds['feeds']:
        if str(f['_id']) == str(feedid):
            return jsonify(f)
    abort(400)

@app.route('/api/v1/feeds/<feedid>/entries/<entryid>', methods=['PUT'])
def api_put_user_feed_entry(feedid, entryid):
    read_val = True
    found_entry = False

    if not request.args.has_key('apikey'):
        abort(400)
    if not request.args.has_key('read'):
        abort(400)
    if 'true' == request.args['read'].lower():
        read_val = True
    elif 'false' == request.args['read'].lower():
        read_val = False
    else:
        abort(400)

    user = users.load_user_by_apikey(request.args['apikey'])
    feeds = current_user.get_feeds(True)
    for f in feeds:
        if str(f.get_id()) == str(feedid):
            print "entry_id " + entryid
            found_entry = f.update_entry_read_val(user, entryid, read_val)
            return 200

    if not found_entry:
        abort(400)

if __name__ == "__main__":
    app.run()
