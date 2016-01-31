/// <reference path="../typings/_custom.d.ts" />

import {Directive, Attribute, ElementRef, DynamicComponentLoader, Injector} from 'angular2/angular2';
import {Router, RouterOutlet} from 'angular2/router';
import {Login} from './components/login/login';

@Directive({
  selector: 'loggedin-router-outlet'
})
export class LoggedInRouterOutlet extends RouterOutlet {

  constructor(private _elementRef: ElementRef, private _loader: DynamicComponentLoader,
              private _parentRouter: Router, @Attribute('name') nameAttr: string) {
      super(_elementRef, _loader, _parentRouter, nameAttr);

//      this.publicRoutes = {
//        '/login': true,
//        '/signup': true
//      };

  }

  canActivate(instruction) {
    var url = this._router.lastNavigationAttempt;
    // If the user is going to a URL that requires authentication and is not
    // logged in (meaning we don't have the JWT saved in localStorage), we
    // redirect the user to the login page.
    if (url !== '/login' && !localStorage.getItem('jwt')) {
      instruction.component = Login;
    }
    return PromiseWrapper.resolve(true);
  }
}

//  publicRoutes: any
//  constructor(public _elementRef: ElementRef, public _loader: DynamicComponentLoader,
//              public _parentRouter: Router, @Attribute('name') nameAttr: string) {
//      super(_elementRef, _loader, _parentRouter, nameAttr);
//
//      this.publicRoutes = {
//        '/login': true,
//        '/signup': true
//      };
//  }
//
//  commit(instruction) {
//    var url = this._parentRouter.lastNavigationAttempt;
//    if (!this.publicRoutes[url] && !localStorage.getItem('jwt')) {
//      instruction.component = Login;
//    }
//    return super.commit(instruction);
//  }
//}
