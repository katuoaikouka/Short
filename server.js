const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static('public'));

// 使用する Invidious インスタンス
const INVIDIOUS_INSTANCE = 'https://invidious.f5.si';

// YouTube APIの初期化（Invidious版では構造維持のためのログ出力のみ）
async function initYouTube() {
    console.log('Invidious API Mode Initialized');
}

// 「面白い」動画を検索して1件返すAPI
app.get('/api/video/funny', async (req, res) => {
    try {
        // 「面白い」で検索（Shortsに限定するためキーワード調整）
        const searchQuery = encodeURIComponent('面白い #shorts');
        const searchRes = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/search?q=${searchQuery}&type=video`);
        const searchResults = await searchRes.json();

        if (!searchResults || !searchResults.length) {
            throw new Error('No videos found');
        }

        // 検索結果からランダムに1つ選択
        const randomIndex = Math.floor(Math.random() * Math.min(searchResults.length, 10));
        const videoData = searchResults[randomIndex];
        const videoId = videoData.videoId;

        // 動画の詳細情報を取得（メタデータ用）
        const videoRes = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/videos/${videoId}`);
        const info = await videoRes.json();
        
        // ytdlpinstance-vercel.vercel.app の itag 18 ストリームURLを構築
        const formatUrl = `https://ytdlpinstance-vercel.vercel.app/stream/${videoId}?format=18`;

        res.json({
            id: videoId,
            title: info.title || "無題",
            description: info.description || "説明はありません",
            author: info.author || "不明な投稿者",
            // 修正箇所: authorThumbnails.url とすることで undefined 404 を回避
            avatar: (info.authorThumbnails && info.authorThumbnails.length > 0) ? info.authorThumbnails.url : "https://via.placeholder.com/100",
            likes: info.likeCount ? info.likeCount.toLocaleString() : "非公開",
            views: info.viewCount ? info.viewCount.toLocaleString() : "0",
            date: info.publishedText || "不明",
            video_url: formatUrl
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
