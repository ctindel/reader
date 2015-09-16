/// <reference path="../../../typings/_custom.d.ts" />

import { Component, View, NgFor, Inject } from 'angular2/angular2';
import { RouterLink, RouteParams } from 'angular2/router';
import { Reader } from '../../services/reader';
import { status, json } from '../../utils/fetch'
import {Http, Headers} from 'angular2/http';

@Component({
    selector: 'feeds',
    viewInjector: [Reader]
})
@View({
    directives: [NgFor, RouterLink],
    template: `
        <label>Subscriptions:</label>
        <ul>
            <li *ng-for="#feed of feeds">
                <h4>{{feed.title}} ({{feed.unreadCount}})</h4>
                <a [router-link]="['/feed', {id: feed._id}]">Read more about this feed</a>
            </li>
        </ul>
    `
})
export class Feeds {
    timeoutId: number;
    feeds: Object;
    service: Reader;
    constructor(service: Reader, http: Http) {
        console.log("Feeds.constructor");
        this.url = 'http://localhost:9000/api/v1.0/';
        //this.service = service;
        //this.feeds = this.service.getFeeds(true);
        http
            .get(this.url + 'feeds?includeUnreadIDs=true',
                 { headers: new Headers({'Authorization' : 'Bearer ' +
localStorage.getItem('jwt') })})
            .toRx()
            .map(res => res.json())
            .subscribe(
                data => this.getFeedsCB(data),
                err => this.getFeedsErrCb(err));
//
//        this.service.getFeeds(true)
//            .then(status)
//            .then(json)
//            .then((response) => {
//                this.setFeeds(response.feeds);
//                console.log("Feeds.constructor");
//                console.dir(this.feeds);
//            });
    }

    getFeedsCB(data) {
        this.feeds=data.feeds;
        console.log(this.feeds);
    }

    getFeedsErrCB(data) {
        console.log('data', data);
        this.feeds=data.feeds;
    }

    setFeeds(feeds: Array<Object>) {
        this.feeds = feeds;
    }
}
