/// <reference path="../../typings/custom.d.ts" />

//import { bootstrap, bind } from 'angular2/angular2';
import { bootstrap } from 'angular2/bootstrap';
import { FORM_BINDINGS } from 'angular2/forms';
import { HTTP_BINDINGS } from 'angular2/http';
import { ROUTER_BINDINGS } from 'angular2/router';
import { Reader } from './services/reader';
import { App } from './app/app';

var universalInjectables = [
  ROUTER_BINDINGS,
  HTTP_BINDINGS,
  Reader
];

bootstrap(
  App,
  universalInjectables
);
