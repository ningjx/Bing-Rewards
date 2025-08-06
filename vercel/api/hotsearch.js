import fs from 'fs/promises';
import path from 'path';

// 热搜 API 信息配置
const apiInfos = [
  { name: "baidu", url: `https://api.gmya.net/Api/BaiduHot?format=json&appkey=${process.env['GMYA_KEY']||''}` , keyword: "title" },
  { name: "baidu", url: "https://zj.v.api.aa1.cn/api/baidu-rs/", keyword: "title" },
  { name: "douyin", url: `https://api.gmya.net/Api/DouYinHot?format=json&appkey=${process.env['GMYA_KEY']||''}` , keyword: "title" },
  { name: "douyin", url: "https://v.api.aa1.cn/api/douyin-hot/", keyword: "word" },
  { name: "toutiao", url: `https://api.gmya.net/Api/TouTiaoHot?format=json&appkey=${process.env['GMYA_KEY']||''}` , keyword: "title" },
  { name: "toutiao", url: "https://free.wqwlkj.cn/wqwlapi/jrtt_hot.php?type=json", keyword: "name" },
  { name: "weibo", url: `https://api.gmya.net/Api/WeiBoHot?format=json&appkey=${process.env['GMYA_KEY']||''}` , keyword: "title" },
  { name: "weibo", url: "https://zj.v.api.aa1.cn/api/weibo-rs/", keyword: "title" },
  { name: "zhihu", url: `https://api.gmya.net/Api/ZhiHuHot?format=json&appkey=${process.env['GMYA_KEY']||''}` , keyword: "title" },
  { name: "zhihu", url: "https://v.api.aa1.cn/api/zhihu-news/index.php?aa1=xiarou", keyword: "title" },
  { name: "bilibili", url: `https://api.gmya.net/Api/BiliBliHot?format=json&appkey=${process.env['GMYA_KEY']||''}` , keyword: "title" },
  { name: "bilibili", url: "https://v.api.aa1.cn/api/bilibili-rs/", keyword: "title" },
  { name: "sougou", url: `https://api.gmya.net/Api/SoGouHot?format=json&appkey=${process.env['GMYA_KEY']||''}` , keyword: "title" }
];

// 读取本地 words.txt 文件，返回字符串数组
async function getWordsFromTxt() {
  const filePath = path.join(process.cwd(), 'vercel', 'static', 'words.txt');
  const content = await fs.readFile(filePath, 'utf-8');
  return content.split(/\r?\n/).filter(Boolean);
}

// 根据 API 信息抓取热搜词
async function getHotSearchWordsFromSource(source, wordsBackup) {
  const result = [];
  const apis = apiInfos.filter(a => a.name === source);
  if (!apis.length) return [];
  for (const api of apis) {
    try {
      const response = await fetch(api.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
          'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'accept-encoding': 'gzip, deflate, br, zstd',
          'accept-language': 'zh-CN,zh;q=0.9',
        }
      });
      if (response.ok) {
        const content = await response.text();
        // 构造正则，提取关键词
        const regex = new RegExp(`(?<="${api.keyword}"\\s*:\\s*")[^"]+(?=")`, 'g');
        const matches = [...content.matchAll(regex)].map(m => m[0]);
        result.push(...matches);
      }
    } catch (e) {
      // 忽略错误，继续下一个 API
    }
    if (result.length > 0) break;
  }
  // 不足 50 条补充本地词
  if (result.length < 50 && wordsBackup && wordsBackup.length > 0) {
    for (let i = 0; i < 50 - result.length; i++) {
      const idx = Math.floor(Math.random() * wordsBackup.length);
      result.push(wordsBackup[idx]);
    }
  }
  return result;
}

// 聚合所有热搜词，去重
async function getALLHotSearchWords() {
  const wordsBackup = await getWordsFromTxt();
  const apiNames = [...new Set(apiInfos.map(a => a.name))];
  const allResults = await Promise.all(apiNames.map(name => getHotSearchWordsFromSource(name, wordsBackup)));
  // 扁平化、去重
  const allWords = Array.from(new Set(allResults.flat().filter(Boolean)));
  return allWords;
}

export default async function handler(req, res) {
  const { source } = req.query;
  const wordsBackup = await getWordsFromTxt();
  let words = [];
  if (source) {
    if (source === 'all') {
      words = await getALLHotSearchWords();
    } else {
      words = await getHotSearchWordsFromSource(source, wordsBackup);
    }
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).send(JSON.stringify(words, null, 2));
}
