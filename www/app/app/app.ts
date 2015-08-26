/// <reference path="../../typings/tsd.d.ts" />

import {View, Component} from 'angular2/angular2';
import {Location, RouteConfig, RouterLink, Router} from 'angular2/router';
import {LoggedInRouterOutlet} from './LoggedInOutlet';
import {Home} from '../components/home/home';
import {Login} from '../components/login/login';
import {Signup} from '../components/signup/signup';

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
    //router: Router;
    location: Location;
    jwt: string;
    decodedJwt: string;

    constructor(public router: Router, location: Location) {
        this.router = router;
        this.location = location;
        this.jwt = localStorage.getItem('jwt');
        this.decodedJwt = this.jwt && window.jwt_decode(this.jwt);
    }

    getLinkStyle(path) {
        return this.location.path() === path;
    }

    logout() {
        localStorage.removeItem('jwt');
        this.router.navigate('/login');
    }
}
