/// <reference path="typings/custom.d.ts" />

import { bootstrap, bind, formInjectables, httpInjectables } from 'angular2/angular2';
import { routerInjectables } from 'angular2/router';
import { Reader } from './services/reader';
import { App } from './app/app';

var universalInjectables = [
  routerInjectables,
  Reader,
  httpInjectables
];

bootstrap(
  App,
  universalInjectables
);
