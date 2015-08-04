/// <reference path="../../typings/tsd.d.ts" />

import {View, Component} from 'angular2/angular2';
import {Location, RouteConfig, RouterLink, Router} from 'angular2/router';
import {LoggedInRouterOutlet} from './LoggedInOutlet';
import {Home} from '../home/home';
import {Login} from '../login/login';
import {Signup} from '../signup/signup';

let template = require('./app.html');

@Component({
  selector: 'reader-app'
})
@View({
  template: template,
  directives: [ LoggedInRouterOutlet, RouterLink ]
})
@RouteConfig([
  { path: '/',       redirectTo: '/home' },
  { path: '/home',   as: 'home',   component: Home },
  { path: '/login',  as: 'login',  component: Login },
  { path: '/signup', as: 'signup', component: Signup }
])
export class App {
    location: Location;

    constructor(public router: Router, location: Location) {
        this.router = router;
        this.location = location;
    }

    getLinkStyle(path) {
        return this.location.path() === path;
    }
}
