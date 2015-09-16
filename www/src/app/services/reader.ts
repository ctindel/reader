/// <reference path="../../typings/_custom.d.ts" />

import {Http, Headers} from 'angular2/http';
import { Injectable } from 'angular2/angular2';

@Injectable()
export class Reader {
    url: string;
    bearer: string;

    constructor(public http: Http) {
        console.log("Reader.constructor");
        this.url = 'http://localhost:9000/api/v1.0/';
    }
    
    public getFeeds (includeUnreadIDs) {
        console.log("Reader.getFeeds");
        this.http
            .get(this.url + 'feeds?includeUnreadIDs=' + includeUnreadIDs, 
                 { headers: new Headers({'Authorization' : 'Bearer ' + localStorage.getItem('jwt') })})
            .toRx()
            .map(res => res.json())
//            .subscribe(
//                data => this.serverData(data),
//                err  => this.errorMessage(err)
//            );

//        return window.fetch(
//            this.url + 'feeds?includeUnreadIDs=' + includeUnreadIDs,
//            {
//                method: 'GET',
//                headers: {
//                    'Authorization': 'Bearer ' + localStorage.getItem('jwt'),
//                }
//            }
//        );
    }
    
  serverData(data) {
    console.log('data', data);
    this.data = data;
  }//serverData

  errorMessage(err) {
      console.dir(err);
  }//errorMessage

    public getFeedEntries (feedID, unreadOnly, unreadEntryIDs) {
        console.log("Reader.getFeedEntries");
//            .get(this.url + 'feeds/entries?unreadOnly=false', 
//                 { headers: new Headers({'Authorization' : 'Bearer ' + localStorage.getItem('jwt') })})
//            .toRx()
//            .map(res => res.json())
//            .subscribe(
//                data => this.serverData(data),
//                err  => this.errorMessage(err)
//            );
//
        return window.fetch(
            this.url + 'feeds/' + feedID + '/entries?unreadOnly=' + unreadOnly,
                + '&unreadEntryIDs=' + unreadEntryIDs.join(),
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization' : 'Bearer ' + localStorage.getItem('jwt'),
                }
            }
        );
    }
}
