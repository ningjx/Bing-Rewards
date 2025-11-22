/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import wordstxt from './static/words.txt';
// 全局变量，存储API元数据
let apiMetadataGlobal = [];
// 热搜 API 信息配置
const createApiInfos = (env) => [
  { name: "baidu", url: `https://api.gmya.net/Api/BaiduHot?format=json&appkey=${env.GMYA_KEY}`, keyword: "title" },
  { name: "baidu", url: "https://zj.v.api.aa1.cn/api/baidu-rs/", keyword: "title" },
  { name: "douyin", url: `https://api.gmya.net/Api/DouYinHot?format=json&appkey=${env.GMYA_KEY}`, keyword: "title" },
  { name: "douyin", url: "https://v.api.aa1.cn/api/douyin-hot/", keyword: "word" },
  { name: "toutiao", url: `https://api.gmya.net/Api/TouTiaoHot?format=json&appkey=${env.GMYA_KEY}`, keyword: "title" },
  { name: "toutiao", url: "https://free.wqwlkj.cn/wqwlapi/jrtt_hot.php?type=json", keyword: "name" },
  { name: "weibo", url: `https://api.gmya.net/Api/WeiBoHot?format=json&appkey=${env.GMYA_KEY}`, keyword: "title" },
  { name: "weibo", url: "https://zj.v.api.aa1.cn/api/weibo-rs/", keyword: "title" },
  { name: "zhihu", url: `https://api.gmya.net/Api/ZhiHuHot?format=json&appkey=${env.GMYA_KEY}`, keyword: "title" },
  { name: "zhihu", url: "https://v.api.aa1.cn/api/zhihu-news/index.php?aa1=xiarou", keyword: "title" },
  { name: "bilibili", url: `https://api.gmya.net/Api/BiliBliHot?format=json&appkey=${env.GMYA_KEY}`, keyword: "title" },
  { name: "bilibili", url: "https://v.api.aa1.cn/api/bilibili-rs/", keyword: "title" },
  { name: "sougou", url: `https://api.gmya.net/Api/SoGouHot?format=json&appkey=${env.GMYA_KEY}`, keyword: "title" },
  { name: "en", url: `https://api.finlight.me/v2/articles`, headers: { 'Content-Type': 'application/json', 'accept': 'application/json', 'X-API-KEY': env.Finlight_KEY }, body: "{\"pageSize\": \"100\"}", keyword: "title" }
];

// 读取本地 words.txt 文件，返回字符串数组
async function getWordsFromTxt() {
  return wordstxt.split(/\r?\n/).filter(Boolean);
}

// 根据 API 信息抓取热搜词
async function getHotSearchWordsFromSource(source, wordsBackup, apiInfos) {
  const result = [];
  const apis = apiInfos.filter(a => a.name === source);
  if (!apis.length) return [];
  for (const api of apis) {
    // 提前提取域名，以便在成功和失败时都能使用
    const urlObj = new URL(api.url);
    const domain = urlObj.hostname;
    try {
      console.log("Fetching API:", api);
      // 设置 10 秒超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);


      // 构建请求配置
      const requestConfig = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
          'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'accept-encoding': 'gzip, deflate, br, zstd',
          'accept-language': 'zh-CN,zh;q=0.9',
        },
        signal: controller.signal
      };

      // 如果API信息包含自定义headers，则合并到请求headers中
      if (api.headers && typeof api.headers === 'object') {
        requestConfig.headers = { ...requestConfig.headers, ...api.headers };
      }

      // 如果API信息包含body，则使用POST请求并添加body
      if (api.body) {
        requestConfig.method = 'POST';
        requestConfig.body = api.body;
      }

      const response = await fetch(api.url, requestConfig);


      clearTimeout(timeoutId);
      if (response.ok) {
        const content = await response.text();
        // 构造正则，提取关键词
        const regex = new RegExp(`(?<="${api.keyword}"\\s*:\\s*")[^"]+(?=")`, 'g');
        const matches = [...content.matchAll(regex)].map(m => m[0]);
        result.push(...matches);
      }
      apiMetadataGlobal.push({
        name: api.name,
        domain: domain,
        length: matches.length,
        status: response.statusText,
      });
    } catch (e) {
      // 忽略错误，继续下一个 API
      console.log("ERROR", e);
      apiMetadataGlobal.push({
        name: api.name,
        domain: domain,
        length: result.length,
        status: 'error',
      });
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
async function getALLHotSearchWords(apiInfos) {
  const wordsBackup = await getWordsFromTxt();
  const apiNames = [...new Set(apiInfos.map(a => a.name))];
  const allResults = await Promise.all(apiNames.map(name => getHotSearchWordsFromSource(name, wordsBackup, apiInfos)));
  // 扁平化、去重
  const allWords = Array.from(new Set(allResults.flat().filter(Boolean)));
  return allWords;
}

// 聚合所有中文热搜词，去重
async function getCNHotSearchWords(apiInfos) {
  const wordsBackup = await getWordsFromTxt();
  const apiNames = [...new Set(apiInfos.map(a => a.name).filter(name => name !== "en"))];
  const allResults = await Promise.all(apiNames.map(name => getHotSearchWordsFromSource(name, wordsBackup, apiInfos)));
  // 扁平化、去重
  const allWords = Array.from(new Set(allResults.flat().filter(Boolean)));
  return allWords;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // 创建 API 配置实例
    const apiInfos = createApiInfos(env);
    //console.log("apiInfos:", apiInfos);
    // 入口为 https://xxx.workers.dev/hotsearch?source=xxxx
    if (url.pathname.toLowerCase() === '/hotsearch') {
      // 清空全局变量
      apiMetadataGlobal = [];
      const source = url.searchParams.get('source');
      const wordsBackup = await getWordsFromTxt();
      //console.log(wordsBackup.length);
      let words = [];
      if (source) {
        if (source === 'all') {
          words = await getALLHotSearchWords(apiInfos);
        }
        else if (source === 'cn') {
          words = await getCNHotSearchWords(apiInfos);
        }
        else {
          words = await getHotSearchWordsFromSource(source, wordsBackup, apiInfos);
        }
      }
      //else {
      //  // 未指定 source，返回所有平台的热搜词（去重）
      //  words = await getALLHotSearchWords();
      //}
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
      // 根据全局变量生成source-domain header
      if (apiMetadataGlobal.length > 0) {
        const sourceDomainValue = apiMetadataGlobal.map(m => `${m.name},${m.domain},${m.length},${m.status}`).join(';');
        headers['source-domain'] = sourceDomainValue;
      }
      return new Response(JSON.stringify(words, null, 2), { headers });
    }
    // 其他路径返回欢迎信息
    return new Response("[]");
  },
};