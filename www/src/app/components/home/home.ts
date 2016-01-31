/// <reference path="../../../typings/_custom.d.ts" />

import {Component, View, CORE_DIRECTIVES, FORM_DIRECTIVES} from 'angular2/angular2';
import {Route, Redirect, Router, RouterLink, ROUTER_DIRECTIVES} from 'angular2/router';
import {Feeds} from '../../components/feeds/feeds';
import {Auth} from '../../services/auth';

function isLoggedIn() {
    var auth = new Auth();
    return auth.isAuth();
}

@Component({
    selector: 'home',
})
@View({
  directives: [ ROUTER_DIRECTIVES, CORE_DIRECTIVES, FORM_DIRECTIVES, Feeds ],
  styles: [`.red {
    color: red;
  }`],
  template: `
    <div class="container">
      <div class="row">
        <div class=”col-md-6 col-lg-4″><feeds></feeds></div>
        <div class=”col-md-6 col-lg-8″><feedEntries></feedEntries></div>
      </div>
    </div>
    `
})
export class Home {
    auth: Auth;

    constructor(public router: Router, public auth: Auth) {
        this.router = router;
        this.auth = auth;
    
        if (!auth.isAuth()) {
            console.log("Home.constructor: navigating to /login");
            this.router.parent.navigate('/login');
        }
    }
}
