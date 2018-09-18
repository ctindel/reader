import React, { Component } from 'react';
import $ from 'jquery';
import TwitterLogin from 'react-twitter-auth';
import FacebookLogin from 'react-facebook-login';
import { GoogleLogin } from 'react-google-login';
import config from './config.json';

//class Feedlist extends Component {
//    renderFeedListEntry(feed) {
//        return (
//            <li key={f.feedID}>
//                <div>feed.feedName</div>
//            </li>
//        );
//    }
//    
//    render() {
//        feeds = this.props.feeds.map(f => {
//                return (
//                    renderFeedListEntry(f);
//                );
//            }
//        );
//        return feeds;
//    }
//}

class App extends Component {

    constructor() {
        super();
        this.state = { isAuthenticated: false, user: null, token: '', feeds: []};
        if (sessionStorage.getItem("myUser")) {
            // Restore the contents of the text field
            var tmpUser = sessionStorage.getItem("myUser");
            console.log(tmpUser);
            var myUser = $.parseJSON(tmpUser);
            var myToken = sessionStorage.getItem("myToken");
            this.setState({isAuthenticated: true, myUser, myToken})
            console.log(myUser);
            console.log(myToken);
        } else {
            console.log("There was no myUser object in sessionStorage");
        }
    }

    logout = () => {
        this.setState({isAuthenticated: false, token: '', user: null})
        sessionStorage.removeItem('myUser');
        sessionStorage.removeItem('myToken');
    };

    showuser = () => {
        this.setState({isAuthenticated: false, token: '', user: null})
        sessionStorage.removeItem('myUser');
        sessionStorage.removeItem('myToken');
    };

    onFailure = (error) => {
        alert(error);
    };

    twitterResponse = (response) => {
        const token = response.headers.get('x-auth-token');
        response.json().then(user => {
            if (token) {
                this.setState({isAuthenticated: true, user, token});
                sessionStorage.setItem('myUser', JSON.stringify(user));
                sessionStorage.setItem('myToken', token);
            }
        });
    };

    facebookResponse = (response) => {
        const tokenBlob = new Blob([JSON.stringify({access_token: response.accessToken}, null, 2)], {type : 'application/json'});
        const options = {
            method: 'POST',
            body: tokenBlob,
            mode: 'cors',
            cache: 'default'
        };
        fetch('http://localhost:4000/api/v1/auth/facebook', options).then(r => {
            const token = r.headers.get('x-auth-token');
            r.json().then(user => {
                if (token) {
                    this.setState({isAuthenticated: true, user, token})
                    sessionStorage.setItem('myUser', JSON.stringify(user));
                    sessionStorage.setItem('myToken', token);
                }
            });
        })
    };

    googleResponse = (response) => {
        const tokenBlob = new Blob([JSON.stringify({access_token: response.accessToken}, null, 2)], {type : 'application/json'});
        const options = {
            method: 'POST',
            body: tokenBlob,
            mode: 'cors',
            cache: 'default'
        };
        fetch('http://localhost:4000/api/v1/auth/google', options).then(r => {
            const token = r.headers.get('x-auth-token');
            r.json().then(user => {
                if (token) {
                    this.setState({isAuthenticated: true, user, token})
                    sessionStorage.setItem('myUser', JSON.stringify(user));
                    sessionStorage.setItem('myToken', token);
                }
            });
        })
    };

    render() {
    let content = !!this.state.isAuthenticated ?
            (
                <div>
                    <div>
                        <button onClick={this.logout} className="button">
                            Log out
                        </button>
                    </div>
                </div>
            ) :
            (
                <div>
                    <TwitterLogin loginUrl="http://localhost:4000/api/v1/auth/twitter"
                                   onFailure={this.onFailure} onSuccess={this.twitterResponse}
                                   requestTokenUrl="http://localhost:4000/api/v1/auth/twitter/reverse"/>
                    <FacebookLogin
                        appId={config.FACEBOOK_APP_ID}
                        autoLoad={false}
                        fields="name,email,picture"
                        callback={this.facebookResponse} />
                    <GoogleLogin
                        clientId={config.GOOGLE_CLIENT_ID}
                        buttonText="Login"
                        onSuccess={this.googleResponse}
                        onFailure={this.onFailure}
                    />
                </div>
            );

        return (
            <div className="App">
                {content}
            </div>
        );
    }
}

export default App;
