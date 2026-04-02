const express = require('express');
const { Innertube } = require('youtubei.js');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static('public'));

let yt;

// YouTube APIの初期化
async function initYouTube() {
    try {
        // キャッシュによる古いアルゴリズムの参照を避けるためfetchオプションを調整
        yt = await Innertube.create({
            fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' })
        });
        console.log('YouTube.js Initialized');
    } catch (e) {
        console.error('Initialization failed:', e);
    }
}

// 「面白い」動画を検索して1件返すAPI
app.get('/api/video/funny', async (req, res) => {
    try {
        // 「面白い」で検索（Shortsに限定するためキーワード調整）
        const search = await yt.search('面白い #shorts', { type: 'video' });
        
        // 検索結果からランダムに1つ選択
        const randomIndex = Math.floor(Math.random() * Math.min(search.results.length, 10));
        const videoId = search.results[randomIndex].id;

        // 動画の詳細情報を取得
        const info = await yt.getInfo(videoId);
        
        // 再生可能なフォーマット（映像+音声）を選択
        // 署名エラー対策としてmp4フォーマットを優先指定
        const format = info.chooseFormat({ 
            type: 'video+audio', 
            quality: 'best',
            format: 'mp4' 
        });

        if (!format || !format.url) {
            throw new Error('Streaming URL not found');
        }

        res.json({
            id: videoId,
            title: info.basic_info.title,
            description: info.basic_info.description || "説明はありません",
            author: info.basic_info.author,
            // thumbnailは配列のため最初の要素を取得するように修正
            avatar: (info.basic_info.thumbnail && info.basic_info.thumbnail.length > 0) ? info.basic_info.thumbnail.url : "",
            likes: info.basic_info.like_count || "非公開",
            views: info.basic_info.view_count || "0",
            date: info.basic_info.upload_date || "不明",
            video_url: format.url
        });
    } catch (error) {
        console.error('Error fetching video:', error);
        res.status(500).json({ error: '動画の取得に失敗しました: ' + error.message });
    }
});

app.listen(PORT, async () => {
    await initYouTube();
    console.log(`Server is running: http://localhost:${PORT}`);
});
