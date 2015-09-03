/// <reference path="../../typings/tsd.d.ts" />

import { Injectable } from 'angular2/angular2';

@Injectable()
export class Reader {
    url: string;
    bearer: string;

    constructor() {
        this.url = 'http://localhost:9000/api/v1.0/';
    }
    
    public getFeeds (includeUnreadIDs) {
        return window.fetch(
            this.url + 'feeds?includeUnreadIDs=' + includeUnreadIDs,
            {
                method: 'GET',
                headers: {
                    'Authorization': 'bearer ' + localStorage.getItem('jwt'),
                }
            }
        );
    }
    
    public getFeedEntries (feedID, unreadOnly, unreadEntryIDs) {
        return window.fetch(
            this.url + 'feeds/' + feedID + '/entries?unreadOnly=' + unreadOnly,
                + '&unreadEntryIDs=' + unreadEntryIDs.join(),
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization' : 'bearer ' + localStorage.getItem('jwt'),
                }
            }
        );
    }
}
