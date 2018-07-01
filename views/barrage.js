function barrageApp() {
    let CM

    const minDuration = 1000 * 16
    const maxDelay = 1000 * 20
    const requestInterval = 1000 * 10

    let lastRequestTimeStamp = 0;
    let lastCompleteTimestamp = 0
    let lastStartTimestamp = 0

    const all_comments = []

    return { init }

    function init() {
        // hack: to make the generated text displayed as HTML
        const originInit = CoreComment.prototype.init

        CoreComment.prototype.init = function () {
            originInit.apply(this, arguments)
            this.dom.innerHTML = this.text;
        }

        CM = new CommentManager(document.getElementById('commentCanvas'));
        CM.init();

        // 启动播放弹幕（在未启动状态下弹幕不会移动）
        CM.start();

        process();

        // resize the player on window size change
        window.addEventListener('resize', resizeHandler)
        document.addEventListener('fullscreenchange', resizeHandler)
    }

    function prepareComments(rawComments) {
        const comments = rawComments.slice();

        comments.forEach(c => {
            c.offset = 0;
            // time string to timestamp
            c.timestamp = new Date(c.comment_time).valueOf();
        })

        comments.sort((a, b) => a.timestamp - b.timestamp);

        comments.forEach((c, i, ctx) => {
            if (i) {
                // calc the time offset per comment relative to previous one
                c.offset = c.timestamp - ctx[i - 1].timestamp
            }
            c.mode = 1
            c.text = `<span class="text" style="background-color: rgba(${str2rgb(c.content)}, 0.5)">${c.content}</span>`
        })

        const delayScale = d3.scaleLinear()
            .domain([0, d3.max(comments, c => c.offset)])
            .range([0, maxDelay])

        // delay the show of each comment base on its time offset under [0, maxDelay]
        comments.forEach(c => c.delay = delayScale(c.offset))

        return comments;
    }

    function publish(rawComments) {
        const comments = prepareComments(rawComments)
        all_comments.push(...comments)
        sendMessages(comments)
    }

    function sendMessages(comments) {
        lastStartTimestamp = Date.now()
        // each comment live with a random period in [16, 24]s
        comments.forEach(c => c.dur = Math.random() * minDuration / 2 + minDuration)

        // emit the comments sequentially with various delay
        Rx.Observable.from(comments)
            .concatMap((value) => {
                return Rx.Observable.of(value)
                    .delay(value.delay)
            })
            .subscribe(item => {
                CM.send(item)
            }, null, () => {
                setTimeout(handleTimeout, minDuration)
            })
    }

    // loop the comments if no more fresh comments arrived
    function handleTimeout() {
        lastCompleteTimestamp = Date.now()
        if (lastCompleteTimestamp > lastStartTimestamp) {
            sendMessages(all_comments)
        }
    }

    function str2rgb(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        var colour = [];
        for (var i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 0xFF;
            colour.push(value);
        }
        return colour;
    }

    function fetchWithParams(path, params, fetchOpts, BASE_URL = location.origin) {
        var url = new URL(`${BASE_URL}${path}`)
        if (params) Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
        return fetch(url, fetchOpts)
            .then((res) => res.json())
            .catch((ex) => console.log("Fetch Exception", ex));
    };

    function process() {
        fetchWithParams('/api/comments', { lasttime: lastRequestTimeStamp })
            .then(res => {
                if (res.data && res.data.length) {
                    lastRequestTimeStamp = tempStamp;
                    document.getElementById('bg').classList.remove('loading');

                    publish(res.data)
                }
                setTimeout(process, requestInterval)
            }, err => console.error(err))
        const tempStamp = Date.now();
        console.log('requested');
    }

    function resizeHandler() {
        CM.setBounds();
    }
}
