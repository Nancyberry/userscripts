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
setInterval(function modifyDashboard() {
    $("td[title='environment.hulu_app_version']").each(function () {
        var $this = $(this);
        var buildNum = $this.parents('tr').find('td:eq(1)').text();
        // console.log(buildNum);
        if (buildNum === null) {
            return;
        }

        var stacktraceNode = $this.parents('tbody').find("td[title='error.stack_trace']")
            .parents('tr').find('td:eq(1)');
        // console.log(stacktraceNode.text());

        var data = {raw_log: stacktraceNode.text(), version: buildNum.trim().substr(-4, 4)};
        console.log(data);

        $.ajax({
            type: 'POST',
            url: "http://manny.server.hulu.com:9000/retrace",
            data: data,
            success: function(response) {
                if(response['success']) {
                    // replace raw log with retraced one
                    console.log(response['data']);
                    stacktraceNode.html(response['data'].replace("\n", "<br/>&nbsp;&nbsp;"));
                } else {
                    alert("Retracing failed.")
                }
            },
            dataType: 'json'
        }).fail(function() {
            alert("There was system error in manny. Please check its error log.");
        });
    });
}, 1000);