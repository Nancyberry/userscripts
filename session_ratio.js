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
var pageChangedFlag = 0;

setInterval(function requestSessionCount() {
    'use strict';
    var duration = $("pretty-duration").text().trim();
    console.log("duration: " + duration);

    if (duration === null) {  // not loaded
        return;
    }

    // check if page has changed
    var flag = verifyPageChange();

    if (flag === pageChangedFlag) {
        // console.log("page not changed");
        return;
    }

    console.log("page changed!");
    pageChangedFlag = flag;

    var timeBucket = selectTimeBucket(duration);
    var timeRange = selectTimeRange(duration);

    if (timeBucket === null || timeRange === null) {
        // alert("Time range not right! Please choose again.");
        return;
    }

    console.log("time bucket is " + timeBucket + ", time range is " + timeRange);

    var currentTime = (new Date()).getTime();
    var startTime = currentTime - calculateTimeElapse(duration);

    var playbackData =
        {
       "datasource":"metrics_playback",
       "view":{
          "type":"timeseries",
          "isStacked":false,
          "timeBucket":timeBucket
       },
       "timeRange":{
          "type":timeRange
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
          "timeBucket":timeBucket
       },
       "timeRange":{
          "type":timeRange
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
            // var playbackSessionCount = response[0]['split'][0]['count'];
            var playbackSessionCount = calculateSessionCount(response, startTime, currentTime);
            console.log("playback " + duration + " session count: " + playbackSessionCount);
            modifyDashboard("total-playback-session-count", playbackSessionCount);
        }
    }).fail(function() {
        alert("There was system error in glyph. Please check its error log.");
    });

    $.ajax({
        type: 'POST',
        url: "http://glyph.prod.hulu.com/api/v1/query",
        data: JSON.stringify(revenueData),
        contentType: "application/json; charset=utf-8",
        dataType: 'json',
        success: function(response) {
            // var revenueSessionCount = response[0]['split'][0]['count'];
            var revenueSessionCount = calculateSessionCount(response, startTime, currentTime);
            console.log("revenue " + duration + " session count: " + revenueSessionCount);
            modifyDashboard("total-ad-session-count", revenueSessionCount);
        }
    });

}, 1000);

function verifyPageChange() {
    var flag = 0;

    $('.panel-title').each(function (index, panelTitle) {
        var $panelTitle = $(panelTitle);
        // Deal with charts with title of which contains divideByTitle
        if ($panelTitle.text().trim().indexOf("divide by") === -1) {
            return 0;
        }

        var $valueNode = $panelTitle.closest('.panel').find('.metric-value');
        var value = $valueNode.text();
        if (!value || value.indexOf('(') !== -1) {
        // if value has not been loaded yet or already calculated
            return 0;
        }

        value = parseIntWithComma(value);
        flag |= value;
    });

    return flag;
}

function selectTimeBucket(duration) {
    duration = duration.toUpperCase();

    if (duration.indexOf("HOUR") !== -1 || duration.indexOf("MIN") !== -1) {
        return "PT1M";
    } else if (duration.indexOf("DAY") !== -1 && parseInt(duration.split(' ')[1]) <= 30) {
        return "PT1H";
    }

    return null;
}

function selectTimeRange(duration) {
    duration = duration.toUpperCase();
    var num = parseInt(duration.split(' ')[1]);

    if (duration.indexOf("HOUR") !== -1 || duration.indexOf("MIN") !== -1) {
        return "past_day";
    } else if (duration.indexOf("DAY") !== -1) {
        if (num <= 7) {
            return "past_week";
        } else if (num <= 30) {
            return "past_month";
        }
    }

    return null;
}

function calculateTimeElapse(duration) {
    duration = duration.toUpperCase();
    var multiply = 1;
    var num = parseInt(duration.split(' ')[1]);

    if (duration.indexOf("MIN") !== -1) {
        multiply = 60 * 1000;
    } else if (duration.indexOf("HOUR") !== -1) {
        multiply = 60 * 60 * 1000;
    } else if (duration.indexOf("DAY") != -1) {
        multiply = 24 * 60 * 60 * 1000;
    }

    return num * multiply;
}

function calculateSessionCount(response, startTime, endTime) {
    var count = 0;
    console.log("total count is " + response[0]['split'][0]['count']);
    var timeArray = response[0]['split'][0]['timeBuckets'];
    // console.log("time array size is " + timeArray.length);

    for (i = 0; i < timeArray.length; ++i) {
        var time = (new Date(Date.parse(timeArray[i]['bucket']['start']))).getTime();

        if (time > endTime) {
            break;
        }

        if (time >= startTime && time <= endTime) {
            count += timeArray[i]['count'];
        }
    }

    console.log("selected time period session count is " + count);
    return count;
}

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
function modifyDashboard(divideByTitle, divideByValue) {
    $('.panel-title').each(function displayRatio(index, panelTitle) {
        var $panelTitle = $(panelTitle);
        // Deal with charts with title of which contains divideByTitle
        if ($panelTitle.text().trim().indexOf(divideByTitle) === -1) {
            return;
        }

        // console.log("result is: " + result);
        var $valueNode = $panelTitle.closest('.panel').find('.metric-value');
        var value = $valueNode.text();
        if (!value || value.indexOf('(') !== -1) {
        // if value has not been loaded yet or already calculated
            return;
        }
        console.log("value node: " + value);

        value = parseIntWithComma(value);
        console.log("The ratio should be " + value + " divide by " + divideByValue);
        var ratio = value / divideByValue;
        $valueNode.append(' (' + Math.round(ratio * 10000) / 100 + "%)");
    });
    return true;
}