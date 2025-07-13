// ==UserScript==
// @name         移动端微软Rewards每日任务脚本
// @version      2025.2.27
// @description  盒马卡，加油卡，电影卡，天猫卡，山姆卡通通都有
// @author       怀沙2049
// @match        https://*.bing.com/*
// @license      GNU GPLv3
// @icon         https://www.bing.com/favicon.ico
// @connect      gumengya.com
// @run-at       document-end
// @note         更新于 2025年2月27日
// @supportURL   https://greasyfork.org/zh-CN/users/1192640-huaisha1224
// @homepageURL  https://greasyfork.org/zh-CN/users/1192640-huaisha1224
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @namespace    https://greasyfork.org/zh-CN/users/1192640-huaisha1224
// @downloadURL https://update.greasyfork.org/scripts/480355/%E7%A7%BB%E5%8A%A8%E7%AB%AF%E5%BE%AE%E8%BD%AFRewards%E6%AF%8F%E6%97%A5%E4%BB%BB%E5%8A%A1%E8%84%9A%E6%9C%AC.user.js
// @updateURL https://update.greasyfork.org/scripts/480355/%E7%A7%BB%E5%8A%A8%E7%AB%AF%E5%BE%AE%E8%BD%AFRewards%E6%AF%8F%E6%97%A5%E4%BB%BB%E5%8A%A1%E8%84%9A%E6%9C%AC.meta.js
// ==/UserScript==

var max_rewards = 30; //重复执行的次数
var pause_time = 960000; // 暂停时长建议为16分钟,也就是960000(60000毫秒=1分钟)
var search_words = []; //搜索词

var default_search_words = ["盛年不重来，一日难再晨", "千里之行，始于足下", "少年易学老难成，一寸光阴不可轻", "敏而好学，不耻下问", "海内存知已，天涯若比邻", "三人行，必有我师焉",
    "莫愁前路无知已，天下谁人不识君", "人生贵相知，何用金与钱", "天生我材必有用", "海纳百川有容乃大；壁立千仞无欲则刚", "穷则独善其身，达则兼济天下", "读书破万卷，下笔如有神",
    "学而不思则罔，思而不学则殆", "一年之计在于春，一日之计在于晨", "莫等闲，白了少年头，空悲切", "少壮不努力，老大徒伤悲", "一寸光阴一寸金，寸金难买寸光阴", "近朱者赤，近墨者黑",
    "吾生也有涯，而知也无涯", "纸上得来终觉浅，绝知此事要躬行", "学无止境", "己所不欲，勿施于人", "天将降大任于斯人也", "鞠躬尽瘁，死而后已", "书到用时方恨少", "天下兴亡，匹夫有责",
    "人无远虑，必有近忧", "为中华之崛起而读书", "一日无书，百事荒废", "岂能尽如人意，但求无愧我心", "人生自古谁无死，留取丹心照汗青", "吾生也有涯，而知也无涯", "生于忧患，死于安乐"]

var keywords_source =['douyin','baidu','toutiao','weibo'];

function hot_dic() {
    // Fisher-Yates 洗牌算法
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    const authToken = ""; // 替换为实际的授权令牌

    const promises = keywords_source.map(source => {
    const url = `http://192.168.50.200:1880/endpoint/hotsearch?source=${source}`;
    // 修改fetch调用，添加headers配置
    return fetch(url, {
        headers: {
            "Authorization": `Basic ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (Array.isArray(data)) return data;
        return []; 
    })
    .catch(error => {
        console.error(`Failed to fetch keywords from ${url}:`, error);
        return []; 
    });
   });

    return Promise.all(promises)
        .then(results => {
            const merged = results.flat();
            const unique = [...new Set(merged)];
            const shuffled = shuffle(unique);
            
            // 如果最终结果为空则返回打乱的默认词
            return shuffled.length > 0 ? shuffled : shuffle([...default_search_words]);
        });
}

hot_dic()
    .then(names => {
        //   console.log(names[0]);
        search_words = names;
        exec()
    })
    .catch(error => {
        console.error(error);
    });

// 定义菜单命令：开始
let menu1 = GM_registerMenuCommand('开始', function () {
    GM_setValue('Cnt', 0); // 将计数器重置为0
    location.href = "https://www.bing.com/?br_msg=Please-Wait"; // 跳转到Bing首页
}, 'o');

// 定义菜单命令：停止
let menu2 = GM_registerMenuCommand('停止', function () {
    GM_setValue('Cnt', max_rewards + 10); // 将计数器设置为超过最大搜索次数，以停止搜索
}, 'o');


// 生成指定长度的包含大写字母、数字的随机字符串
function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        // 从字符集中随机选择字符，并拼接到结果字符串中
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function exec() {
    // 生成随机延迟时间
    let randomDelay = Math.floor(Math.random() * 20000) + 10000; // 生成10秒到30秒之间的随机数
    let randomString = generateRandomString(4); //生成4个长度的随机字符串
    let randomCvid = generateRandomString(32); //生成32位长度的cvid
    'use strict';

    // 检查计数器的值，若为空则设置为超过最大搜索次数
    if (GM_getValue('Cnt') == null) {
        GM_setValue('Cnt', max_rewards + 10);
    }

    // 获取当前搜索次数
    let currentSearchCount = GM_getValue('Cnt');
    // 根据计数器的值选择搜索引擎
    if (currentSearchCount <= max_rewards / 2) {
        let tt = document.getElementsByTagName("title")[0];
        tt.innerHTML = "[" + currentSearchCount + " / " + max_rewards + "] " + tt.innerHTML; // 在标题中显示当前搜索次数
        smoothScrollToBottom(); // 添加执行滚动页面到底部的操作
        GM_setValue('Cnt', currentSearchCount + 1); // 将计数器加1
        setTimeout(function () {
            let nowtxt = search_words[currentSearchCount]; // 获取当前搜索词

            // 检查是否需要暂停
            if ((currentSearchCount + 1) % 5 === 0) {
                // 暂停指定时长
                setTimeout(function() {
                    location.href = "https://www.bing.com/search?q=" + encodeURI(nowtxt) + "&form=" + randomString + "&cvid=" + randomCvid; // 在Bing搜索引擎中搜索
                }, pause_time);
            } else {
                location.href = "https://www.bing.com/search?q=" + encodeURI(nowtxt) + "&form=" + randomString + "&cvid=" + randomCvid; // 在Bing搜索引擎中搜索
            }
        }, randomDelay);
    } else if (currentSearchCount > max_rewards / 2 && currentSearchCount < max_rewards) {
        let tt = document.getElementsByTagName("title")[0];
        tt.innerHTML = "[" + currentSearchCount + " / " + max_rewards + "] " + tt.innerHTML; // 在标题中显示当前搜索次数
        smoothScrollToBottom(); // 添加执行滚动页面到底部的操作
        GM_setValue('Cnt', currentSearchCount + 1); // 将计数器加1
        setTimeout(function () {
            let nowtxt = search_words[currentSearchCount]; // 获取当前搜索词

            // 检查是否需要暂停
            if ((currentSearchCount + 1) % 5 === 0) {
                // 暂停指定时长
                setTimeout(function() {
                    location.href = "https://cn.bing.com/search?q=" + encodeURI(nowtxt) + "&form=" + randomString + "&cvid=" + randomCvid; // 在Bing搜索引擎中搜索
                }, pause_time);
            } else {
                location.href = "https://cn.bing.com/search?q=" + encodeURI(nowtxt) + "&form=" + randomString + "&cvid=" + randomCvid; // 在Bing搜索引擎中搜索
            }
        }, randomDelay);
    }
        // 实现平滑滚动到页面底部的函数
    function smoothScrollToBottom() {
            document.documentElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
}
