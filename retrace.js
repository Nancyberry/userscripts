// ==UserScript==
// @name         Doppler Retrace Extension
// @namespace    http://your.homepage/
// @version      0.1
// @description  Retrace proguarded log
// @author       Nancy
// @match        http://doppler-kibana.prod.hulu.com/*
// @match        http://doppler-kibana.staging.hulu.com/*
// @grant        none
// ==/UserScript==
/* global $:false */
var success = setInterval(function retraceLog() {
    $("td[title='environment.hulu_app_version']").each(function () {
        var $this = $(this);
        var buildNum = $this.parents('tr').find('td:eq(1)').text();
        if (buildNum === null) {
            return;
        }

        var stacktraceNode = $this.parents('tbody').find("td[title='error.stack_trace']")
            .parents('tr').find('td:eq(1)');
        var rawLog = stacktraceNode.text();
        if (rawLog === null) {
            return;
        }

        var data = {raw_log: rawLog, version: buildNum.trim().substr(-4, 4)};
        console.log(data);

        // show "retracing..." when it starts
        stacktraceNode.html("Retracing...");

        $.ajax({
            type: 'POST',
            url: "http://manny.server.hulu.com:9000/retrace",
            data: data,
            success: function(response) {
                if(response['success']) {
                    console.log(response['data']);
                    // replace raw log with retraced one
                    stacktraceNode.html(formateLog(response['data']));
                } else {
                    alert("Retracing failed. Please check your params.")
                    stacktraceNode.html(formateLog(rawLog));
                }
            },
            dataType: 'json'
        }).fail(function() {
            alert("There was system error in manny. Please check its error log.");
            stacktraceNode.html(formateLog(rawLog));
        });

        clearInterval(success);
    });
}, 1000);

function formateLog(log) {
    return log.trim().replace(/\n/g, "<br/>&nbsp;&nbsp;&nbsp;&nbsp;");
}