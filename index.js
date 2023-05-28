const axios = require('axios');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
var COS = require('cos-nodejs-sdk-v5');
require('dotenv').config()

// 创建实例
var cos = new COS({
    SecretId: process.env.SecretId,
    SecretKey: process.env.SecretKey,
});

// 存储桶名称，由bucketname-appid 组成，appid必须填入，可以在COS控制台查看存储桶名称。 https://console.cloud.tencent.com/cos5/bucket
var Bucket = 'pic2cloud-1313199830';
// 存储桶Region可以在COS控制台指定存储桶的概览页查看 https://console.cloud.tencent.com/cos5/bucket/ 
// 关于地域的详情见 https://cloud.tencent.com/document/product/436/6224
var Region = 'ap-chengdu';

const metaPath = path.join(__dirname, 'tmp', 'ghip.yaml');
const ghDitectPath = path.join(__dirname, 'tmp', 'gh520.yaml');

/**
 * 
 * @param {uploadCOS} metaCallback 
 */
function getData(metaCallback) {
    // 从 GitHub API 获取 IP
    axios.get('https://api.github.com/meta')
    .then(response => {
        const IPCIDR = response.data;
        // win端代理这两个应该够了
        const web = IPCIDR.web;
        const git = IPCIDR.git;
        // 构造 IP-CIDR 数组
        const webPayload = web.map(ipcidr => {
            return `IP-CIDR,${ipcidr}`;
        });
        const gitPayload = git.map(ipcidr => {
            return `IP-CIDR,${ipcidr}`;
        });
        // 合并两个数组并去重
        const mergedArray = Array.from(new Set(webPayload.concat(gitPayload)));
        // 将数据保存到 YAML 文件中
        const yaml = 
`payload:
${mergedArray.map(ipcidr => `  - ${ipcidr}`).join('\n')}
`;
        fs.writeFileSync(metaPath, yaml);
        console.log('GitHub API 规则已创建');
        // 在数据准备好后调用回调函数
        metaCallback('ghip.yaml',metaPath);
    })
    .catch(error => {
        console.error(error);
    }
    );
}

/**
 * @param {uploadCOS} hostCallback 
 */
function getHost(hostCallback) {
    // 从 GitHub520 Repo 获取 Hosts 文件
    axios.get('https://ghproxy.954001.xyz/https://raw.githubusercontent.com/521xueweihan/GitHub520/main/hosts')
    .then(response => {
        const hosts = response.data;
        // 从 hosts 文件中提取 IP 地址
        const ipRegex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;
        const ips = hosts.match(ipRegex);
        // 构造 IP-CIDR 数组
        const payload = ips.map(ip => {
            return `IP-CIDR,${ip}/32`;
        });
        // 将数据保存到 YAML 文件中
        const yaml = 
`payload:
${payload.map(item => `  - ${item}`).join('\n')}
`;
        fs.writeFileSync(ghDitectPath, yaml);
        console.log('Hosts 规则已创建');
        // 在数据准备好后调用回调函数
        hostCallback('gh520.yaml',ghDitectPath);
    })
}


/**
 * 上传文件到 COS 存储桶
 * @param {string} fileName 
 * @param {fs.PathLike} filePath 
 */
function uploadCOS(fileName, filePath) {
    // https://github.com/tencentyun/cos-nodejs-sdk-v5/blob/42a01d0ea7a5c43e987f79b6efa6eea4a3dd27aa/demo/demo.js#L796
    cos.putObject({
        Bucket: Bucket, /* 必须 */
        Region: Region,    /* 必须 */
        Key: fileName,              /* 必须 */
        Body: fs.createReadStream(filePath), // 上传文件对象
        ContentLength: fs.statSync(filePath).size,
    }, function(err, data) {
        console.log(err || data);
    });
}



function scheduleDaily() {
    const rule = new schedule.RecurrenceRule();
    // 规定每天的10点10分执行
    rule.hour = 12; 
    rule.minute = 3;
    rule.tz = 'Asia/Shanghai'
    const job = schedule.scheduleJob(rule, () => {
        getData(uploadCOS)
        getHost(uploadCOS)
    });
  }

scheduleDaily();
