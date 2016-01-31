/// <reference path="../../../typings/_custom.d.ts" />

import {Component, View} from 'angular2/angular2';
import {Http, Headers} from 'angular2/http';
import {status, json} from '../../utils/fetch';
import { Router, RouterLink } from 'angular2/router';
import {Auth} from '../../services/auth';

@Component({
  selector: 'login'
})
@View({
  directives: [RouterLink],
  styles: [ `
    .login {
      width: 40%;
    }
  `],
  template: `
<div class="login jumbotron center-block">
  <h1>Login</h1>
  <form role="form" (submit)="login($event, username.value, password.value)">
  <div class="form-group">
    <label for="username">Username</label>
    <input type="text" #username class="form-control" id="username"
placeholder="Username">
  </div>
  <div class="form-group">
    <label for="password">Password</label>
    <input type="password" #password class="form-control" id="password"
placeholder="Password">
  </div>
  <button type="submit" class="btn btn-default">Submit</button>
</form>
</div>
`
})
export class Login {
  auth: Auth;
 
  constructor(public router: Router, public http: Http, public auth: Auth) {
    this.router = router;
    this.auth = auth;
    if (auth.isAuth()) {
      this.router.navigate('/home');
    }
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
      console.dir(response);
      localStorage.setItem('jwt', response.access_token);
      console.log("Login.login: response.access_token=" + response.access_token);
      console.log("About to navigate to /home");
      //this.router.parent.navigate('/home');
      this.router.navigate('/home');
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
