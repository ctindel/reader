/// <reference path="../typings/_custom.d.ts" />

/*
 * Angular 2 decorators and servces
 */
import {Directive, Component, View, LifecycleEvent} from 'angular2/angular2';
import {Route, Redirect, RouteConfig, Router, RouterLink} from 'angular2/router';
// should be angular2/http in next release
import {Http} from 'angular2/http';
import {Home} from './components/home/home';
import {Feeds} from './components/feeds/feeds';
import {Login} from './components/login/login';
import {Signup} from './components/signup/signup';
import {Auth} from './services/auth';

/*
 * Angular Directives
 */
import {CORE_DIRECTIVES, FORM_DIRECTIVES} from 'angular2/angular2';
import {ROUTER_DIRECTIVES} from 'angular2/router';

/*
 * App Component
 * Top Level Component
 */
@Component({
  selector: 'reader-app',
})
@View({
  // needed in order to tell Angular's compiler what's in the template
  directives: [ RouterLink, CORE_DIRECTIVES, FORM_DIRECTIVES ],
  template: `
    <!-- Fixed navbar -->
    <div class="navbar navbar-default navbar-fixed-top">
      <div class="container">
        <div class="navbar-header">
          <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
            <span class="sr-only">Toggle navigation</span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
          </button>
          <a class="navbar-brand" href="#">{{title}}</a>
        </div>
        <div id="navbar" class="navbar-collapse collapse">
          <ul class="nav navbar-nav">
            <li [class.active]="['/home']"><a [router-link]="['/home']">Home</a></li>
          </ul>
          <ul class="nav navbar-nav navbar-right">
            <li class="dropdown">
              <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Dropdown <span class="caret"></span></a>

              <ul class="dropdown-menu">
                <li><a (click)="logout()">Logout</a></li>
                <li><a [router-link]="['/home']">Another action</a></li>
                <li><a [router-link]="['/home']">Something else here</a></li>
                <li role="separator" class="divider"></li>
                <li class="dropdown-header">Configuration</li>
                <li><a [router-link]="['/home']">Separated link</a></li>
                <li><a [router-link]="['/home']">One more separated link</a></li>
              </ul>
            </li>
          </ul>
        </div><!--/.nav-collapse -->
      </div>
    </div>

    <main>
      <router-outlet>
      </router-outlet>
    </main>
  `
})
@RouteConfig([
  new Redirect({ path: '/',       redirectTo: '/home' }),
  new Route({ path: '/home',   component: Home, as: 'home' }),
  new Route({ path: '/feed',   component: Feeds, as: 'feed' }),
  new Route({ path: '/login',  component: Login, as: 'login' }),
  new Route({ path: '/signup', component: Signup, as: 'signup' })
])
//@RouteConfig([
//  { path: '/',       redirectTo: '/home' },
//  { path: '/home',   component: Home, as: 'Home' },
//  { path: '/feed',   component: Feeds, as: 'Feed' },
//  { path: '/login',  component: Login, as: 'Login' },
//  { path: '/signup', component: Signup, as: 'Signup' }
//])
export class App {
    title: string;
    jwt: string;
    auth: Auth;

    constructor(public http: Http, public router: Router, public auth: Auth) {
        this.title = 'Reader';
        this.jwt = localStorage.getItem('jwt');
        this.auth = auth;
        this.router = router;
    }

    logout() {
        this.auth.logout();
        this.router.navigate('/login');
    }
}
