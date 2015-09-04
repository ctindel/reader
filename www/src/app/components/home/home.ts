/// <reference path="../../../typings/_custom.d.ts" />

import {Component, View, CORE_DIRECTIVES} from 'angular2/angular2';
import {status, text} from '../../utils/fetch';
import {Router} from 'angular2/router';
import {Feeds} from '../../components/feeds/feeds';
import {Http, Headers} from 'angular2/http';
import {Auth} from '../../services/auth';

let styles   = require('./home.css');
let template = require('./home.html');


@Component({
    selector: 'home',
    injectables: [Auth]
})
@View({
  styles: [ styles ],
  template: template,
  directives: [ CORE_DIRECTIVES, Feeds ]
})
export class Home {
    auth: Auth;
    user: string;
    isAuth: boolean;

    constructor(public router: Router, public http: Http, public auth: Auth) {
        this.router = router;
        this.auth = auth;
    
        this.isAuth = auth.isAuth();
    
        if (this.isAuth) {
            this.user = this.auth.getUser();
        } else {
            this.router.parent.navigate('/login');
        }
    }

    logout(event) {
        event.preventDefault();
        this.auth.logout();
        this.isAuth = false;
        this.user = null;
    }
}
