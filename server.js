const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

// publicフォルダ内の静的ファイル（index.html等）を公開
app.use(express.static(path.join(__dirname, 'public')));

// Invidious APIのインスタンス（いくつか候補がありますが、比較的安定しているものを使用）
const INVIDIOUS_API = 'https://invidious.io.lol/api/v1';

/**
 * 動画情報をランダムに取得するAPI
 */
app.get('/api/get-video', async (req, res) => {
    try {
        // "Shorts"というキーワードで検索し、動画リストを取得
        const searchResponse = await axios.get(`${INVIDIOUS_API}/search`, {
            params: {
                q: 'Shorts #shorts',
                type: 'video',
                region: 'JP'
            }
        });

        const videos = searchResponse.data;

        if (!videos || videos.length === 0) {
            throw new Error('No videos found');
        }

        // 取得したリストからランダムに1つ選択
        const randomVideo = videos[Math.floor(Math.random() * videos.length)];

        // 詳細な動画情報を返却
        res.json({
            videoId: randomVideo.videoId,
            title: randomVideo.title,
            author: randomVideo.author,
            authorThumb: randomVideo.authorThumbnails?.url || '',
            viewCount: randomVideo.viewCount,
            likeCount: randomVideo.likeCount || 0,
            publishedText: randomVideo.publishedText,
            description: randomVideo.description || 'No description provided.'
        });

    } catch (error) {
        console.error('Error fetching video:', error.message);
        res.status(500).json({ error: 'Failed to fetch video data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
