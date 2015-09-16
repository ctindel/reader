/// <reference path="../typings/_custom.d.ts" />

/*
 * Angular 2 decorators and servces
 */
import {Directive, Component, View, LifecycleEvent} from 'angular2/angular2';
import {Route, Redirect, RouteConfig, Router, RouterLink} from 'angular2/router';
// should be angular2/http in next release
import {Http} from 'angular2/http';
//import {LoggedInRouterOutlet} from './LoggedInOutlet';
import {Home} from './components/home/home';
import {Feeds} from './components/feeds/feeds';
import {Login} from './components/login/login';
import {Signup} from './components/signup/signup';

/*
 * Angular Directives
 */
import {CORE_DIRECTIVES, FORM_DIRECTIVES} from 'angular2/angular2';
import {ROUTER_DIRECTIVES} from 'angular2/router';

let template = require('./app.html');

/*
 * App Component
 * Top Level Component
 */
@Component({
  selector: 'reader-app',
})
@View({
  // needed in order to tell Angular's compiler what's in the template
  directives: [ ROUTER_DIRECTIVES, CORE_DIRECTIVES, FORM_DIRECTIVES ],
  template: template,
})
@RouteConfig([
  new Redirect({ path: '/',       redirectTo: '/home' }),
  new Route({ path: '/home',   as: 'home',   component: Home }),
  new Route({ path: '/feed',   as: 'feed',   component: Feeds }),
  new Route({ path: '/login',  as: 'login',  component: Login }),
  new Route({ path: '/signup', as: 'signup', component: Signup })
])
export class App {
    title: string;
    jwt: string;

    constructor(public http: Http, public router: Router) {
        this.title = 'Reader';
        this.jwt = localStorage.getItem('jwt');
    }

    logout() {
        localStorage.removeItem('jwt');
        this.router.navigate('/login');
    }
}
