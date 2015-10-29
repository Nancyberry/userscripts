// ==UserScript==
// @name         Doppler Android Dashboard Ratio Extension
// @namespace    http://your.homepage/
// @version      0.1
// @description  Display dead content/ad session ratio. Session counts are fetched from glyph.
// @author       Nancy
// @match        http://doppler-kibana.prod.hulu.com/*
// @match        http://doppler-kibana.staging.hulu.com/*
// @grant        none
// ==/UserScript==
/* global $:false */

var success = setInterval(function modifyDashboard() {
    'use strict';
    // Currently we only calculate the session ratio for the last 24 hours
    var duration = $("pretty-duration").text();
    console.log("duration: " + duration);
    if (duration.indexOf("Last 24 hours") === -1) {
        return;
    }

    var playbackData =
        {
       "datasource":"metrics_playback",
       "view":{
          "type":"timeseries",
          "isStacked":false,
          "timeBucket":"PT1M"
       },
       "timeRange":{
          "type":"past_day"
       },
       "metrics":[
          {
             "type":"count",
             "name":"count"
          }
       ],
       "resultLimit":10,
       "resultLimitType":"descending",
       "splitBy":"distro",
       "filter":{
          "type":"and",
          "filters":[
             {
                "type":"is",
                "fields":[
                   "beaconevent",
                   "start"
                ]
             },
             {
                "type":"is",
                "fields":[
                   "device_fam",
                   "Android"
                ]
             }
          ]
       }
    };

    var revenueData =
    {
       "datasource":"metrics_revenue",
       "view":{
          "type":"timeseries",
          "isStacked":false,
          "timeBucket":"PT1M"
       },
       "timeRange":{
          "type":"past_day"
       },
       "metrics":[
          {
             "type":"count",
             "name":"count"
          }
       ],
       "resultLimit":10,
       "resultLimitType":"descending",
       "splitBy":"distro",
       "filter":{
          "type":"and",
          "filters":[
             {
                "type":"is",
                "fields":[
                   "beaconevent",
                   "end"
                ]
             },
             {
                "type":"is",
                "fields":[
                   "device_fam",
                   "Android"
                ]
             }
          ]
       }
    };

    $.ajax({
        type: 'POST',
        url: "http://glyph.prod.hulu.com/api/v1/query",
        data: JSON.stringify(playbackData),
        contentType: "application/json; charset=utf-8",
        dataType: 'json',
        success: function(response) {
            var playbackSessionCount = response[0]['split'][0]['count'];
            console.log("playback last day session count: " + playbackSessionCount);
            displayRatio("total-playback-session-count", playbackSessionCount);
        }
    });

    $.ajax({
        type: 'POST',
        url: "http://glyph.prod.hulu.com/api/v1/query",
        data: JSON.stringify(revenueData),
        contentType: "application/json; charset=utf-8",
        dataType: 'json',
        success: function(response) {
            var revenueSessionCount = response[0]['split'][0]['count'];
            console.log("revenue last day session count: " + revenueSessionCount);
            displayRatio("total-ad-session-count", revenueSessionCount);
        }
    });

}, 1000);

/**
* Parse a str int with comma in it
*/
function parseIntWithComma(str) {
    if (str.replace) {
      str = str.replace(/,/g, '');
    }
    return parseInt(str);
}

/**
* Append ratio after the original count
 */
function displayRatio(divideByTitle, divideByValue) {
    // check duration again
    var duration = $("pretty-duration").text();
    console.log("duration: " + duration);
    if (duration.indexOf("Last 24 hours") === -1) {
        return;
    }

    $('.panel-title').each(function (index, panelTitle) {
        var $panelTitle = $(panelTitle);
        // if ($panelTitle.text().trim().toUpperCase() !== chartTitle.toUpperCase()) {
        //   return;
        // }

        // Deal with charts with title of which contains divideByTitle
        if ($panelTitle.text().trim().indexOf(divideByTitle) === -1) {
            return;
        }

        // console.log("result is: " + result);
        var $valueNode = $panelTitle.closest('.panel').find('.metric-value');
        var value = $valueNode.text();
        if (value.indexOf('/') !== -1) {
          // already calculated
          return;
        }
        value = parseIntWithComma(value);
        console.log("The ratio should be " + value + " divide by " + divideByValue);
        var ratio = value / divideByValue;
        $valueNode.append(' / ' + Math.round(ratio * 10000) / 100 + "%");
      });
}