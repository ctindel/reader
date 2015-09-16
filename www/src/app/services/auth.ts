/// <reference path="../../typings/_custom.d.ts" />

import { Injectable } from 'angular2/angular2';
import { status, json } from '../utils/fetch';

@Injectable()
export class Auth {
    token: string;
    user: string;

    constructor() {
        this.token = localStorage.getItem('jwt');
        this.user = this.token && window.jwt_decode(this.token);
        console.log("Auth.constructor: this.token=" + this.token);
        console.log("Auth.constructor: this.user=");
        console.dir(this.user);
    }
  
    isAuth() {
        return !!this.token;
    }
  
    getUser() {
        return this.user;
    }
  
    login(username, password) {
        window.fetch('http://localhost:9000/api/v1.0/oauth/token?grant_type=password',
        {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username, password
            })
        })
        .then(status)
        .then(json)
        .then((response) => {
            console.log("response is:");
            console.dir(response);
            console.log("Cookies: ");
            console.dir(document.cookie);
            this.token = response.access_token;
            this.user = this.token && window.jwt_decode(this.token);
            localStorage.setItem('jwt', this.token);
            console.log("Auth.login: this.token=" + this.token);
            console.log("Auth.login: this.user=" + this.user);
        })
        .catch((error) => {
            alert(error.message);
            console.log(error.message);
        });
      }
  
    logout() {
        localStorage.removeItem('jwt');
        this.token = null;
        this.user = null;
    }
}
