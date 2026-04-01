const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Invidiousインスタンスのリスト（動かない場合は適宜変更してください）
const INVIDIOUS_INSTANCES = [
    'https://invidious.snopyta.org',
    'https://vid.puffyan.us',
    'https://invidious.kavin.rocks',
    'https://inv.riverside.rocks'
];

const YT_DLP_API = 'https://ytdlpinstance-vercel.vercel.app';

// ランダムにインスタンスを取得
const getBaseUrl = () => INVIDIOUS_INSTANCES[Math.floor(Math.random() * INVIDIOUS_INSTANCES.length)];

app.get('/video/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    const baseUrl = getBaseUrl();

    try {
        // 1. 動画情報とコメントを並行して取得
        const [videoRes, commentsRes] = await Promise.all([
            axios.get(`${baseUrl}/api/v1/videos/${videoId}`),
            axios.get(`${baseUrl}/api/v1/comments/${videoId}`)
        ]);

        const videoDataRaw = videoRes.data;
        const commentsDataRaw = commentsRes.data;

        // 2. ストリームURLの決定 (ytdlpinstanceを優先的に使用する例)
        // ytdlpのAPI仕様に合わせて調整が必要ですが、一般的には直リンクを生成します
        let streamUrl = `${YT_DLP_API}/api/info?url=https://www.youtube.com/watch?v=${videoId}`;
        
        // もしInvidiousのプロキシ経由が良い場合はこちら
        // let streamUrl = `${baseUrl}/latest_version?id=${videoId}&itag=22`;

        const videoData = {
            videoTitle: videoDataRaw.title,
            stream_url: videoDataRaw.formatStreams?.?.url || "youtube-nocookie", 
            channelName: videoDataRaw.author,
            channelImage: videoDataRaw.authorThumbnails?.[videoDataRaw.authorThumbnails.length - 1]?.url,
            likeCount: videoDataRaw.likeCount?.toLocaleString() || '0'
        };

        const commentsData = {
            commentCount: videoDataRaw.commentCount || 0,
            comments: commentsDataRaw.comments.map(c => ({
                author: c.author,
                authorThumbnails: c.authorThumbnails,
                content: c.content
            }))
        };

        // テンプレートのレンダリング（ご提示のHTMLを文字列として出力）
        const html = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>${videoData.videoTitle}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                /* ... (ここにあなたのCSSを貼り付け) ... */
                body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; color: #fff; font-family: "Roboto", sans-serif; overflow: hidden; }
                .shorts-wrapper { position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: #000; }
                .video-container { position: relative; height: 94vh; aspect-ratio: 9/16; background: #000; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10; }
                @media (max-width: 600px) { .video-container { height: 100%; width: 100%; border-radius: 0; } }
                video, iframe { width: 100%; height: 100%; object-fit: cover; border: none; position: relative; z-index: 11; }
                .progress-container { position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: rgba(255,255,255,0.2); z-index: 25; }
                .progress-bar { height: 100%; background: #ff0000; width: 0%; transition: width 0.1s linear; }
                .bottom-overlay { position: absolute; bottom: 0; left: 0; width: 100%; padding: 100px 16px 24px; background: linear-gradient(transparent, rgba(0,0,0,0.8)); z-index: 20; pointer-events: none; }
                .bottom-overlay * { pointer-events: auto; }
                .channel-info { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
                .channel-info img { width: 32px; height: 32px; border-radius: 50%; }
                .channel-name { font-weight: 500; font-size: 15px; }
                .subscribe-btn { background: #fff; color: #000; border: none; padding: 6px 12px; border-radius: 18px; font-size: 12px; font-weight: bold; cursor: pointer; margin-left: 8px; }
                .video-title { font-size: 14px; line-height: 1.4; margin-bottom: 8px; font-weight: 400; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .side-bar { position: absolute; right: 8px; bottom: 80px; display: flex; flex-direction: column; gap: 16px; align-items: center; z-index: 30; }
                .action-btn { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
                .btn-icon { width: 44px; height: 44px; background: rgba(255,255,255,0.12); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: 0.2s; margin-bottom: 4px; }
                .btn-icon:active { transform: scale(0.9); background: rgba(255,255,255,0.25); }
                .action-btn span { font-size: 11px; text-shadow: 0 1px 2px rgba(0,0,0,0.8); font-weight: 400; }
                .swipe-hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.6); padding: 12px 20px; border-radius: 30px; display: flex; align-items: center; gap: 10px; z-index: 50; opacity: 0; pointer-events: none; transition: opacity 0.5s; border: 1px solid rgba(255,255,255,0.2); }
                .swipe-hint.show { opacity: 1; animation: bounce 2s infinite; }
                @keyframes bounce { 0%, 100% { transform: translate(-50%, -50%); } 50% { transform: translate(-50%, -60%); } }
                .comments-panel { position: absolute; bottom: 0; left: 0; width: 100%; height: 70%; background: #181818; border-radius: 16px 16px 0 0; z-index: 40; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; }
                .comments-panel.open { transform: translateY(0); }
                .comments-header { padding: 16px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
                .comments-body { flex: 1; overflow-y: auto; padding: 16px; }
                .comment-item { display: flex; gap: 12px; margin-bottom: 18px; }
                .comment-avatar { width: 32px; height: 32px; border-radius: 50%; }
                .top-nav { position: absolute; top: 16px; left: 16px; z-index: 35; display: flex; align-items: center; color: white; text-decoration: none; }
                .top-nav i { font-size: 20px; filter: drop-shadow(0 0 4px rgba(0,0,0,0.5)); }
                .loading-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 100; display: flex; align-items: center; justify-content: center; opacity: 1; transition: 0.3s; }
                .loading-screen.fade { opacity: 0; pointer-events: none; }
            </style>
        </head>
        <body>
            <div id="loader" class="loading-screen"><i class="fas fa-circle-notch fa-spin fa-2x"></i></div>
            <div class="shorts-wrapper">
                <div class="video-container">
                    <a href="/" class="top-nav"><i class="fas fa-arrow-left"></i></a>
                    <div id="swipeHint" class="swipe-hint"><i class="fas fa-hand-pointer"></i><span>下にスワイプして次の動画へ移動</span></div>
                    
                    ${videoData.stream_url !== "youtube-nocookie" 
                        ? `<video id="videoPlayer" data-src="${videoData.stream_url}" loop playsinline></video>` 
                        : `<iframe id="videoIframe" data-src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&loop=1&playlist=${videoId}&modestbranding=1&rel=0" allow="autoplay"></iframe>`}
                    
                    <div class="progress-container"><div id="progressBar" class="progress-bar"></div></div>
                    <div class="side-bar">
                        <div class="action-btn"><div class="btn-icon"><i class="fas fa-thumbs-up"></i></div><span>${videoData.likeCount}</span></div>
                        <div class="action-btn"><div class="btn-icon"><i class="fas fa-thumbs-down"></i></div><span>低評価</span></div>
                        <div class="action-btn" onclick="toggleComments()"><div class="btn-icon"><i class="fas fa-comment-dots"></i></div><span>${commentsData.commentCount}</span></div>
                        <div class="action-btn"><div class="btn-icon"><i class="fas fa-share"></i></div><span>共有</span></div>
                        <div class="action-btn"><div class="btn-icon" style="background:none;"><img src="${videoData.channelImage}" style="width:30px; height:30px; border-radius:4px; border:2px solid #fff;"></div></div>
                    </div>
                    <div class="bottom-overlay">
                        <div class="channel-info"><img src="${videoData.channelImage}"><span class="channel-name">@${videoData.channelName}</span><button class="subscribe-btn">登録</button></div>
                        <div class="video-title">${videoData.videoTitle}</div>
                    </div>
                    <div id="commentsPanel" class="comments-panel">
                        <div class="comments-header"><h3 style="margin:0; font-size:16px;">コメント</h3><i class="fas fa-times" style="cursor:pointer;" onclick="toggleComments()"></i></div>
                        <div class="comments-body">
                            ${commentsData.comments.length > 0 ? commentsData.comments.map(c => `
                                <div class="comment-item">
                                    <img class="comment-avatar" src="${c.authorThumbnails?.?.url || 'https://via.placeholder.com/32'}">
                                    <div>
                                        <div style="font-size:12px; color:#aaa; font-weight:bold;">${c.author}</div>
                                        <div style="font-size:14px; margin-top:2px;">${c.content}</div>
                                    </div>
                                </div>`).join('') : '<p style="text-align:center; color:#888;">コメントはありません</p>'}
                        </div>
                    </div>
                </div>
            </div>
            <script>
                // ... (あなたの提供したJavaScript) ...
                let startY = 0;
                const loader = document.getElementById('loader');
                const commentsPanel = document.getElementById('commentsPanel');
                const swipeHint = document.getElementById('swipeHint');
                const progressBar = document.getElementById('progressBar');

                window.onload = () => {
                    const video = document.getElementById('videoPlayer');
                    const iframe = document.getElementById('videoIframe');
                    if (video) {
                        video.src = video.dataset.src;
                        video.play().catch(e => console.log("Auto-play blocked"));
                        video.ontimeupdate = () => { const percent = (video.currentTime / video.duration) * 100; progressBar.style.width = percent + '%'; };
                    }
                    if (iframe) { iframe.src = iframe.dataset.src; }
                    loader.classList.add('fade');
                    swipeHint.classList.add('show');
                    setTimeout(() => { swipeHint.classList.remove('show'); }, 1500);
                };
                function toggleComments() { commentsPanel.classList.toggle('open'); }
                async function loadNextShort() {
                    // ここで次の動画IDを取得するロジック
                    window.location.reload(); 
                }
                window.addEventListener('touchstart', e => startY = e.touches.pageY);
                window.addEventListener('touchend', e => { if (startY - e.changedTouches.pageY > 100) loadNextShort(); });
                window.addEventListener('wheel', e => { if (e.deltaY > 50) loadNextShort(); }, { passive: true });
            </script>
        </body>
        </html>`;

        res.send(html);
    } catch (error) {
        console.error(error);
        res.status(500).send("Video data fetch failed.");
    }
});

// 次の動画レコメンド用API
app.get('/api/recommendations', async (req, res) => {
    try {
        const baseUrl = getBaseUrl();
        // 適当なトレンドや関連動画を返す
        const response = await axios.get(`${baseUrl}/api/v1/trending?type=Shorts`);
        res.json({ items: response.data });
    } catch (e) {
        res.status(500).json({ items: [] });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
