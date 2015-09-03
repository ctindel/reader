/// <reference path="../../../typings/_custom.d.ts" />

import {Component, View, CORE_DIRECTIVES} from 'angular2/angular2';
import {status, text} from '../../utils/fetch';
import {Router} from 'angular2/router';
import {Feeds} from '../../components/feeds/feeds';
import {Http, Headers} from 'ngHttp/http';

let styles   = require('./home.css');
let template = require('./home.html');


@Component({
  selector: 'home'
})
@View({
  styles: [ styles ],
  template: template,
  directives: [ CORE_DIRECTIVES, Feeds ]
})
export class Home {
  jwt: string;
  decodedJwt: string;
  response: string;
  api: string;

  constructor(public router: Router, public http: Http) {
    this.jwt = localStorage.getItem('jwt');
    this.decodedJwt = this.jwt && window.jwt_decode(this.jwt);
  }

  _callApi(type, url) {
    this.response = null;
    this.api = type;
    var headers = new Headers();
    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', 'bearer ' + this.jwt);
    this.http.get(url, {headers: headers})
    .toRx()
    .map(status)
    .map(text)
    .subscribe(
      response => {
          this.response = response;
      },
      error => {
          this.response = error.message;
      }
    )
  }
}
