/// <reference path="../../typings/custom.d.ts" />

import { Component, View, NgFor, Inject } from 'angular2/angular2';
import { RouterLink, RouteParams } from 'angular2/router';
import { Reader } from '../../services/reader';
import { status, json } from '../../utils/fetch'

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
                <h3>{{feed}}</h3>
                <a [router-link]="['/feed', {id: feed._id}]">Read more about this artist</a>
            </li>
        </ul>
    `
})

export class Feeds {
    timeoutId: number;
    feeds: Object;
    service: Reader;
    constructor(service: Reader) {
        this.service = service;
        this.feeds = this.service.getFeeds(true);
        this.service.getFeeds(true)
            .then(status)
            .then(json)
            .then((response) => {
                this.setFeeds(response.feeds);
            });
    }
    setFeeds(feeds: Array<Object>) {
        this.feeds = feeds;
    }
}
