//Mastodon Timeline Peeping Tool Made by YUKIMOCHI(@YUKIMOCHI@toot.yukimochi.jp)
//This software is released under the MIT License.
//Copyright (c) 2017 YUKIMOCHI Laboratory

ws_connection = null
last_request = null
instance = null
Blocking = false
federate = null

window.onload = function () {
    var search_box = document.getElementsByClassName("search__input")[0];
    search_box.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            instance = search_box['value'];
            var actions = document.getElementsByClassName("actions")[0];
            actions.setAttribute('style', '');
            refresh();
            get_instance(instance, insert_instance);
        }
    })
    var ws_ltl = document.getElementsByClassName("start-ws-ltl")[0];
    var ws_ftl = document.getElementsByClassName("start-ws-ftl")[0];
    ws_ltl.addEventListener('click', function (event) {
        event.preventDefault();
        if (Blocking != true) {
            Blocking = true
            federate = false
            ws_ltl.setAttribute('style', 'background-color:coral');
            ws_ftl.setAttribute('style', 'background-color:lightblue');
            instance = search_box['value']
            open_ws(instance, federate)
            get_statases(instance, last_request, !federate, insert_toot)
            ws_connection.addEventListener('message', function (event) {
                document.getElementsByClassName("poll-way")[0].textContent = 'Connect with WebSocket'
                insert_toot(JSON.parse(event.data).payload, true, null);
            });
            Interval(3, get_statases, federate);
        }
    })
    ws_ftl.addEventListener('click', function (event) {
        event.preventDefault();
        if (Blocking != true) {
            Blocking = true
            federate = true
            ws_ltl.setAttribute('style', 'background-color:lightblue');
            ws_ftl.setAttribute('style', 'background-color:coral');
            instance = search_box['value'];
            open_ws(instance, federate)
            get_statases(instance, last_request, !federate, insert_toot)
            ws_connection.addEventListener('message', function (event) {
                document.getElementsByClassName("poll-way")[0].textContent = 'Connect with WebSocket'
                insert_toot(JSON.parse(event.data).payload, true, null);
            });
            Interval(3, get_statases, federate);
        }
    })
}

function open_ws(instance, federate) {
    url = 'wss://' + instance + '/api/v1/streaming';
    if (federate) {
        url += '?stream=public'
    } else {
        url += '?stream=public:local'
    }
    ws_connection = new WebSocket(url)
}

function refresh() {
    last_request = null;
}

function Interval(sec, callback, ltl) {
    var clock = 0
    var id = setInterval(function () {
        clock++;
        if (clock > sec) {
            clock = 0;
            if (ws_connection.readyState != 1) {
                document.getElementsByClassName("poll-way")[0].textContent = 'Connect with Polling'
                callback(instance, last_request, !federate, insert_toot);
            }
        }
    }, 1000)
}

function insert_instance(text, err) {
    instance = JSON.parse(text);

    document.getElementsByClassName("instance_name")[0].textContent = instance['title'];
    document.getElementsByClassName("instance_domain")[0].textContent = instance['uri'];
    document.getElementsByClassName("instance_description")[0].innerHTML = instance['description'];
    document.getElementsByClassName("user-counter")[0].textContent = instance['stats']['user_count'];
    document.getElementsByClassName("toot-counter")[0].textContent = instance['stats']['status_count'];
    document.getElementsByClassName("connection-counter")[0].innerHTML = instance['stats']['domain_count'];
    if (instance['thumbnail'] != null) {
        thumb = document.getElementsByClassName("instance_thumbnail")[0];
        thumb.setAttribute('style', 'background-image: url(' + instance['thumbnail'] + ')');
    }
}

function insert_toot(text, ws, err) {
    entrys = processing_entrys(text, ws)

    if (entrys != null) {
        entrys.forEach(entry => {
            parent = document.getElementsByClassName("activity-stream")[0]
            child = parent.firstElementChild;
            parent.insertBefore(entry, child);
        });
    }
    lock = false
}

function get_instance(instance, callback) {
    url = 'https://' + instance + '/api/v1/instance';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function () {
        copy = xhr.responseText;
        xhr.abort();
        callback(copy, null);
    }
    xhr.onerror = function (err) {
        callback(None, err);
    }
    xhr.send()
}

function get_statases(instance, since_id, local, callback) {
    url = 'https://' + instance + '/api/v1/timelines/public';
    if (local) {
        url += '?local=true'
        if (since_id != null) {
            url += '&since_id=' + since_id;
        }
    } else {
        if (since_id != null) {
            url += '?since_id=' + since_id;
        }
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function () {
        callback(xhr.responseText, false, null);
    }
    xhr.onerror = function (err) {
        callback(None, err);
    }
    xhr.send()
}

function processing_entrys(data, ws) {
    if (ws) {
        statuses = [JSON.parse(data)];
    } else {
        statuses = JSON.parse(data);
    }
    if (statuses.length > 0) {
        last_request = statuses[0]['id'];

        entrys = []
        for (let idx = 0; idx < statuses.length; idx++) {
            const status = statuses[idx];
            try {
                account = status['account'];
                media_attachments = status['media_attachments'];
                status__header = html_status__header(status['url'], status['created_at'], account['url'], account['avatar'], account['display_name'], account['acct']);
                status__content = html_status__content(status['content']);

                md_att = []
                for (let idx_md_att = 0; idx_md_att < media_attachments.length; idx_md_att++) {
                    const media_attachment = media_attachments[idx_md_att];
                    md_att.push(media_attachment['url']);
                }
                MediaGallery = null
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
    if (MediaGallery != null) {
        status.appendChild(MediaGallery);
    }
    entry.appendChild(status)

    return entry
}

function html_status__header(status_url, status_time, author_url, author_avatar_url, author_name, author_id) {
    var status__header = document.createElement('div');
    status__header.setAttribute('class', 'status__header');

    var status__meta = document.createElement('div');
    status__meta.setAttribute('class', 'status__meta');
    var status__relative_time = document.createElement('a');
    status__relative_time.setAttribute('class', 'status__relative-time u-url u-uid');
    status__relative_time.setAttribute('rel', 'noopener');
    status__relative_time.setAttribute('href', status_url);
    var time_ago = document.createElement('time');
    time_ago.setAttribute('class', 'time-ago');
    time_ago.textContent = status_time;
    status__relative_time.appendChild(time_ago);
    status__meta.appendChild(status__relative_time);

    var status__display_name = document.createElement('a');
    status__display_name.setAttribute('class', 'status__display-name p-author h-card');
    status__display_name.setAttribute('rel', 'noopener');
    status__display_name.setAttribute('href', author_url);
    var status__avatar = document.createElement('div');
    status__avatar.setAttribute('class', 'status__avatar');
    var around_img = document.createElement('div');
    var u_photo = document.createElement('img');
    u_photo.setAttribute('class', 'u-photo');
    u_photo.setAttribute('width', 48);
    u_photo.setAttribute('height', 48);
    u_photo.setAttribute('src', author_avatar_url);
    around_img.appendChild(u_photo);
    status__avatar.appendChild(around_img);
    var display_name = document.createElement('span');
    display_name.setAttribute('class', 'display-name');
    var strong = document.createElement('strong');
    strong.setAttribute('class', 'p-name emojify');
    strong.textContent = author_name;
    var span = document.createElement('span');
    span.textContent = '@' + author_id;
    display_name.appendChild(strong);
    display_name.appendChild(span);
    status__display_name.appendChild(status__avatar);
    status__display_name.appendChild(display_name);

    status__header.appendChild(status__meta);
    status__header.appendChild(status__display_name);

    return status__header;
}

function html_status__content(text) {
    var status__content = document.createElement('div');
    status__content.setAttribute('class', 'status__content p-name emojify');
    var e_content = document.createElement('div');
    e_content.setAttribute('class', 'e-content');
    e_content.innerHTML = text;
    status__content.appendChild(e_content);

    return status__content;
};

function html_MediaGallery(img_urls) {
    var media_gallery = document.createElement('div');
    media_gallery.setAttribute('class', 'media-gallery')
    media_gallery.setAttribute('style', 'height: 240px;')

    img_urls.forEach(img_url => {
        var media_gallery__item = document.createElement('div');
        media_gallery__item.setAttribute('class', 'media-gallery__item');
        media_gallery__item.setAttribute('style', 'left: auto; top: auto; right: auto; bottom: auto; width: 100%; height: 100%;');
        var media_gallery__item_thumbnail = document.createElement('a');
        media_gallery__item_thumbnail.setAttribute('class', 'media-gallery__item-thumbnail');
        media_gallery__item_thumbnail.setAttribute('href', img_url);
        media_gallery__item_thumbnail.setAttribute('target', '_blank');
        var img = document.createElement('img');
        img.setAttribute('src', img_url);
        media_gallery__item_thumbnail.appendChild(img);
        media_gallery__item.appendChild(media_gallery__item_thumbnail);
        media_gallery.appendChild(media_gallery__item);
    });

    return media_gallery;
};