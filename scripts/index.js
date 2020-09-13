//Mastodon Timeline Peeping Tool Made by YUKIMOCHI(@YUKIMOCHI@toot.yukimochi.jp)
//This software is released under the MIT License.
//Copyright (c) 2019 YUKIMOCHI Laboratory

urlparam = new Object;
decodeURIComponent(location.search.substring(1)).split("&").forEach(value => {
    var keyvalue = value.split("=");
    urlparam[keyvalue[0]] = keyvalue[1];
})
last_request = null;

window.onload = function () {
    var search_box = document.getElementById("instance_input");
    if (urlparam.instance) {
        search_box.value = urlparam.instance;
        get_instance(insert_instance);
        if (urlparam.federate && (urlparam.federate === "1" || urlparam.federate === "true")) {
            show_timeline(true);
        }
    }
    search_box.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            get_instance(insert_instance);
        }
    });
    document.getElementById("start-ws-ltl").addEventListener('click', function (event) {
        if (last_request == null) {
            event.preventDefault();
            federate = false;
            show_timeline(federate);
        }
    });
    document.getElementById("start-ws-ftl").addEventListener('click', function (event) {
        if (last_request == null) {
            event.preventDefault();
            federate = true;
            show_timeline(federate);
        }
    });
};

function show_timeline(federate) {
    if (federate) {
        document.getElementById("start-ws-ltl").setAttribute('style', 'background-color:lightblue');
        document.getElementById("start-ws-ftl").setAttribute('style', 'background-color:coral');
    } else {
        document.getElementById("start-ws-ltl").setAttribute('style', 'background-color:coral');
        document.getElementById("start-ws-ftl").setAttribute('style', 'background-color:lightblue');
    }

    open_connection(federate);
}

function open_connection(federate) {
    var instance = document.getElementById("instance_input")['value'];
    var url = 'wss://' + instance + '/api/v1/streaming';

    open_traditional_ws(url, federate, open_future_ws);
}

function open_traditional_ws(url, federate, callback) {
    var req_url = url;
    if (federate) {
        req_url += '?stream=public';
    } else {
        req_url += '?stream=public:local';
    }
    var ws_connection = new WebSocket(req_url);
    ws_connection.addEventListener('open', function () {
        document.getElementById("poll-way").textContent = 'Connect with WebSocket (Traditional)';
    });
    ws_connection.addEventListener('message', function (event) {
        insert_toot(JSON.parse(event.data).payload, true, null);
    });
    ws_connection.addEventListener('close', function (event) {
        callback(url, federate, null);
    });
}

function open_future_ws(url, federate, callback) {
    var req_url = url + "/";
    var ws_connection = new WebSocket(req_url);
    ws_connection.addEventListener('open', function () {
        document.getElementById("poll-way").textContent = 'Connect with WebSocket (Experiment)';
        ws_connection.send(JSON.stringify({ type: "subscribe", stream: federate ? "public" : "public:local" }));
    });
    ws_connection.addEventListener('message', function (event) {
        insert_toot(JSON.parse(event.data).payload, true, null);
    });
    ws_connection.addEventListener('close', function (event) {
        document.getElementById("poll-way").textContent = 'Connect Failed';
        callback;
    });
}

function insert_instance(text, err) {
    if (err) {
        document.getElementById("search__icon").setAttribute('class', 'fa fa-times active');
        document.getElementById("search__icon").setAttribute('style', 'color: red;');
        document.getElementById("instance_input").setAttribute('style', 'color: red;');
    } else {
        document.getElementById("search__icon").removeAttribute('class');
        document.getElementById("actions").removeAttribute('style');
        document.getElementById("instance_input").disabled = true;
        instance = JSON.parse(text);

        document.getElementById("instance_name").textContent = instance['title'];
        document.getElementById("instance_domain").textContent = instance['uri'];
        document.getElementById("instance_description").innerHTML = instance['description'];
        document.getElementById("user-counter").textContent = instance['stats']['user_count'];
        document.getElementById("toot-counter").textContent = instance['stats']['status_count'];
        document.getElementById("connection-counter").innerHTML = instance['stats']['domain_count'];
        if (instance['thumbnail'] !== null) {
            thumb = document.getElementById("instance_thumbnail");
            thumb.setAttribute('style', 'background-image: url(' + instance['thumbnail'] + ')');
        }
    }
}

function insert_toot(text, ws, err) {
    var entrys = processing_entrys(text, ws);

    if (entrys !== null) {
        entrys.forEach(entry => {
            var parent = document.getElementsByClassName("activity-stream")[0];
            var child = parent.firstElementChild;
            parent.insertBefore(entry, child);
        });
    }
}

function get_instance(callback) {
    document.getElementById("search__icon").removeAttribute('style');
    document.getElementById("instance_input").removeAttribute('style');
    document.getElementById("search__icon").setAttribute('class', 'fa fa-spin fa-spinner active');

    var instance = document.getElementById("instance_input")['value'];
    var url = 'https://' + instance + '/api/v1/instance';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function () {
        copy = xhr.responseText;
        xhr.abort();
        callback(copy, null);
    };
    xhr.onerror = function (err) {
        callback(null, err);
    };
    xhr.send();
}

function processing_entrys(data, ws) {
    if (ws) {
        var statuses = [JSON.parse(data)];
    } else {
        var statuses = JSON.parse(data);
    }
    if (statuses.length > 0) {
        last_request = statuses[0]['id'];

        var entrys = [];
        for (var idx = 0; idx < statuses.length; idx++) {
            const status = statuses[idx];
            try {
                var account = status['account'];
                var media_attachments = status['media_attachments'];
                var status__header = html_status__header(status['url'], new Date(status['created_at']), account['url'], account['avatar'], account['display_name'], account['acct']);
                var status__content = html_status__content(status['content']);

                var md_att = [];
                for (var idx_md_att = 0; idx_md_att < media_attachments.length; idx_md_att++) {
                    const media_attachment = media_attachments[idx_md_att];
                    md_att.push(media_attachment['preview_url']);
                }
                var MediaGallery = null;
                if (media_attachments.length > 0) {
                    MediaGallery = html_MediaGallery(md_att);
                }
                entrys.unshift(html_entry(status__header, status__content, MediaGallery));
            }
            catch (e) {

            }
        }
        return entrys;
    } else {
        return null;
    }
}

function html_entry(status__header, status__content, MediaGallery) {
    var entry = document.createElement('div');
    entry.setAttribute('class', 'entry h-entry');
    var status = document.createElement('div');
    status.setAttribute('class', 'status light');
    status.appendChild(status__header);
    status.appendChild(status__content);
    if (MediaGallery !== null) {
        status.appendChild(MediaGallery);
    }
    entry.appendChild(status);

    return entry;
}

function html_status__header(status_url, status_time, author_url, author_avatar_url, author_name, author_id) {
    var t = document.importNode(document.querySelector('#html_status__header').content, true);
    t.querySelector('div.status__header div.status__meta a.status__relative-time.u-url.u-uid').setAttribute('href', status_url);
    t.querySelector('div.status__header div.status__meta a.status__relative-time.u-url.u-uid time.time-ago').innerText = status_time.toLocaleString();
    t.querySelector('div.status__header a.status__display-name.p-author.h-card').setAttribute('href', author_url);
    t.querySelector('div.status__header a.status__display-name.p-author.h-card div.status__avatar div img.u-photo').setAttribute('src', author_avatar_url);
    t.querySelector('div.status__header a.status__display-name.p-author.h-card span.display-name strong.p-name.emojify').innerText = author_name;
    t.querySelector('div.status__header a.status__display-name.p-author.h-card span.display-name span').innerText = "@" + author_id;

    return t;
}

function html_status__content(text) {
    var t = document.importNode(document.querySelector('#html_status__content').content, true);
    t.querySelector('div.status__content.p-name.emojify div.e-content p').innerHTML = text;

    return t;
}

function html_MediaGallery(img_urls) {
    img_urls = img_urls.slice(0, 4);
    var media_gallery = document.createElement('div');
    media_gallery.setAttribute('class', 'media-gallery');
    media_gallery.setAttribute('style', 'height: 240px;');

    var styles = "";
    switch (img_urls.length) {
        case 1:
            styles = ["left: auto; top: auto; right: auto; bottom: auto; width: 100%; height: 100%;"];
            break;
        case 2:
            styles = ["left: auto; top: auto; width: 50%; height: 100%; right: 2px; bottom: auto;",
                "left: 2px; top: auto; width: 50%; height: 100%; right: auto; bottom: auto;"];
            break;
        case 3:
            styles = ["left: auto; top: auto; width: 100%; height: 50%; right: 2px; bottom: 2px;",
                "left: 2px; top: auto; width: 50%; height: 50%; right: auto; bottom: 2px;",
                "left: auto; top: 2px; width: 50%; height: 50%; right: 2px; bottom: auto;"];
            break;
        case 4:
            styles = ["left: auto; top: auto; width: 50%; height: 50%; right: 2px; bottom: 2px;",
                "left: 2px; top: auto; width: 50%; height: 50%; right: auto; bottom: 2px;",
                "left: auto; top: 2px; width: 50%; height: 50%; right: 2px; bottom: auto;",
                "left: 2px; top: 2px; width: 50%; height: 50%; right: auto; bottom: auto;"];
            break;
        default:
            break;
    }

    var num = 0;
    img_urls.forEach(img_url => {
        var t = document.importNode(document.querySelector('#html_media__gallery_item').content, true);
        t.querySelector('div.media-gallery__item').setAttribute('style', styles[num]);
        t.querySelector('div.media-gallery__item a.media-gallery__item-thumbnail').setAttribute('href', img_url);
        t.querySelector('div.media-gallery__item a.media-gallery__item-thumbnail img').setAttribute('src', img_url);
        media_gallery.appendChild(t);
        num++;
    });

    return media_gallery;
}
