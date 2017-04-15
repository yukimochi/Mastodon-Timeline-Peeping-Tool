//Mastodon Timeline Peeping Tool Made by YUKIMOCHI(@YUKIMOCHI@toot.yukimochi.jp)
//This software is released under the MIT License.
//Copyright (c) 2017 YUKIMOCHI Laboratory

var Enable_Stream = false;
var Is_Fedrate = false;
var latest_head = 0;

$("#Stream_Local").click(function () {
    Enable_Stream = true;
    Is_Fedrate = false;
    latest_head = 0;
    Lock_Button();
    Stream_Fetch();
});

$("#Stream_Federate").click(function () {
    Enable_Stream = true;
    Is_Fedrate = true
    latest_head = 0;
    Lock_Button();
    Stream_Fetch();
});

$("#Stream_Stop").click(function () {
    Enable_Stream = false;
});

function Lock_Button() {
    $("#Stream_Local").attr("disabled", "disabled");
    $("#Stream_Federate").attr("disabled", "disabled");
    $("#Stream_Stop").removeAttr("disabled");
}

function UnLock_Button() {
    $("#Stream_Local").removeAttr("disabled");
    $("#Stream_Federate").removeAttr("disabled");
    $("#Stream_Stop").attr("disabled", "disabled");
}

function Stream_Fetch() {
    var UrlBase = "";
    if (Is_Fedrate) {
        UrlBase = 'https://' + $("#Instance").val() + '/api/v1/timelines/public';
    }
    else {
        UrlBase = 'https://' + $("#Instance").val() + '/api/v1/timelines/public?local="true"';
    }
    $.ajax({
        type: 'GET',
        url: UrlBase,
        dataType: 'json',
        success: function (json) {
            var len = json.length;
            var temp;
            for (var i = 0; i < len; i++) {
                if (json[len - i - 1].id > latest_head) {
                    var date = new Date(Date.parse(json[len - i - 1].created_at));
                    $("#Timeline_head").eq(0).after(
                        "<tr><td><img src=\"" + json[len - i - 1].account.avatar + "\"width=\"32pt\" /> " + json[len - i - 1].account.display_name + "</td>" + "<td><a href=\"" + json[len - i - 1].account.url + "\"/a>" + json[len - i - 1].account.acct + "</td>" + "<td>" + json[len - i - 1].content + "</td>" + "<td>" + date.toLocaleString() + "</td></tr>"
                    )
                }
            }
            latest_head = json[0].id;
        }
    });
    if (Enable_Stream) {
        window.setTimeout("Stream_Fetch()", 1000);
    }
    else {
        UnLock_Button();
    }
}