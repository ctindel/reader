/// <reference path="../../../typings/_custom.d.ts" />

import {Component, View} from 'angular2/angular2';
import {Http, Headers} from 'ngHttp/http';
import {status, json} from '../../utils/fetch';
import { Router, RouterLink } from 'angular2/router';

let styles   = require('./login.css');
let template = require('./login.html');

@Component({
  selector: 'login'
})
@View({
  styles: [ styles ],
  template: template,
  directives: [RouterLink]
})
export class Login {
  constructor(public router: Router, public http: Http) {

  }

  login(event, username, password) {
    event.preventDefault();

    window.fetch('http://localhost:9000/api/v1.0/oauth/token?grant_type=password', {
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
      localStorage.setItem('jwt', response.access_token);
      console.log("Login.login: response.access_token=" + response.access_token);
      this.router.parent.navigate('/home');
    })
    .catch((error) => {
      alert(error.message);
      console.log(error.message);
    });


//    var headers = new Headers();
//    headers.append('Accept', 'application/json');
//    headers.append('Content-Type', 'application/json');
//    this.http.post('http://localhost:9000/api/v1.0/oauth/token?grant_type=password',
//      JSON.stringify({
//        username, password
//      }),
//      { 
//        headers: headers
//      }
//    )
//    .toRx()
//    .map(status)
//    .map(json)
//    .subscribe(
//      response => {
//        localStorage.setItem('jwt', response.access_token);
//        this.router.parent.navigate('/home');
//      },
//      error => {
//        alert(error.message);
//        console.log(error.message);
//      }
//    );
  }

  signup(event) {
    event.preventDefault();
    this.router.parent.navigate('/signup');
  }
}
