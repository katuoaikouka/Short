const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static('public'));

// 使用する Invidious インスタンス（安定性が高いものを選択）
const INVIDIOUS_INSTANCE = 'https://invidious.f5.si';

// YouTube APIの初期化（構造維持のための空関数）
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

        if (!searchResults || searchResults.length === 0) {
            throw new Error('No videos found');
        }

        // 検索結果からランダムに1つ選択
        const randomIndex = Math.floor(Math.random() * Math.min(searchResults.length, 10));
        const videoData = searchResults[randomIndex];
        const videoId = videoData.videoId;

        // 動画の詳細情報を取得
        const videoRes = await fetch(`${INVIDIOUS_INSTANCE}/api/v1/videos/${videoId}`);
        const info = await videoRes.json();
        
        // 再生可能なフォーマット（映像+音声）を選択
        // InvidiousではformatStreamsに直接再生可能なURLが含まれる
        const format = info.formatStreams.find(f => f.container === 'mp4') || info.formatStreams;

        if (!format || !format.url) {
            throw new Error('Streaming URL not found');
        }

        res.json({
            id: videoId,
            title: info.title,
            description: info.description || "説明はありません",
            author: info.author,
            // チャンネルアイコンのパスを修正
            avatar: (info.authorThumbnails && info.authorThumbnails.length > 0) ? info.authorThumbnails.url : "",
            likes: info.likeCount ? info.likeCount.toLocaleString() : "非公開",
            views: info.viewCount ? info.viewCount.toLocaleString() : "0",
            date: info.publishedText || "不明",
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
