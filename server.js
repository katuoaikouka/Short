import express from "express";
import { Innertube, UniversalCache } from "youtubei.js";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(__dirname));

// CORS設定
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

let yt;
const getYoutube = async () => {
  if (!yt) {
    yt = await Innertube.create({
      lang: "ja",
      location: "JP",
      cache: new UniversalCache(true),
      generate_session_locally: true,
    });
  }
  return yt;
};

// ルートアクセス
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// favicon.icoのエラーを消すためのダミーエンドポイント
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ショート動画フィード取得
app.get('/api/shorts', async (req, res) => {
  try {
    const youtube = await getYoutube();
    const shortsFeed = await youtube.getShorts();
    const videos = shortsFeed.contents || shortsFeed.videos || [];
    
    res.status(200).json({
      videos: videos.map(v => ({
        id: v.id,
        title: v.title?.text || "無題のショート動画",
        thumbnails: v.thumbnails || [],
        view_count: v.view_count?.text || "0",
        author: {
          id: v.author?.id || null,
          name: v.author?.name || "Unknown",
          thumbnails: v.author?.thumbnails || [{ url: 'https://via.placeholder.com/48' }]
        }
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ストリーミングプロキシ
app.get('/api/stream/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const youtube = await getYoutube();
    const info = await youtube.getBasicInfo(videoId);
    const format = info.chooseFormat({ type: 'video+audio', quality: 'best' });

    if (!format || !format.url) return res.status(404).send("Stream not found");

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    if (req.headers.range) headers['Range'] = req.headers.range;

    const response = await fetch(format.url, { headers });
    
    res.status(response.status);
    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach(h => {
      const v = response.headers.get(h);
      if (v) res.setHeader(h, v);
    });

    response.body.pipe(res);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => console.log(`Backend Server: http://localhost:${PORT}`));
