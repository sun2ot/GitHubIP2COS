const axios = require('axios');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const { exec } = require('child_process');
var COS = require('cos-nodejs-sdk-v5');
require('dotenv').config()

// 创建实例
var cos = new COS({
    SecretId: process.env.SecretId,
    SecretKey: process.env.SecretKey,
});

// 存储桶名称，由bucketname-appid 组成，appid必须填入，可以在COS控制台查看存储桶名称。 https://console.cloud.tencent.com/cos5/bucket
var Bucket = process.env.Bucket;
// 存储桶Region可以在COS控制台指定存储桶的概览页查看 https://console.cloud.tencent.com/cos5/bucket/ 
// 关于地域的详情见 https://cloud.tencent.com/document/product/436/6224
var Region = process.env.Region;

const metaPath = path.join(__dirname, 'tmp', 'ghip.yaml');
const ghDitectPath = path.join(__dirname, 'tmp', 'gh520.yaml');
const scriptPath = './deploy.sh';


/**
 * 
 * @param {uploadCOS} metaCallback 
 */
async function getData(metaCallback) {
  return new Promise((resolve, reject) => {
    // 从 GitHub API 获取 IP
    axios.get('https://api.github.com/meta')
    .then( async (response) => {
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
      await metaCallback('ghip.yaml',metaPath);
      resolve();
    })
    .catch(error => {
      console.error(error);
      reject();
    });
  });
}

/**
 * @param {uploadCOS} hostCallback 
 */
async function getHost(hostCallback) {
  return new Promise((resolve, reject) => {
    // 从 GitHub520 Repo 获取 Hosts 文件
    axios.get('https://raw.githubusercontent.com/521xueweihan/GitHub520/main/hosts')
    .then( async (response) => {
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
      await hostCallback('gh520.yaml',ghDitectPath);
      resolve();
    })
    .catch(error => {
      console.error(error);
      reject();
    });
  });
}


/**
 * 上传文件到 COS 存储桶
 * @param {string} fileName 
 * @param {fs.PathLike} filePath 
 */
async function uploadCOS(fileName, filePath) {
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
    rule.hour = 13; 
    rule.minute = 5;
    rule.tz = 'Asia/Shanghai'
    const job = schedule.scheduleJob(rule, async () => {
        try {
          await getData(uploadCOS);
          await getHost(uploadCOS);
          await new Promise((resolve, reject) => {
            exec(`sh ${scriptPath}`, (error, stdout, stderr) => {
              if (error) {
                reject(`执行 Shell 脚本时出错：${error}`);
              } else {
                console.log(`Shell 脚本的标准输出：${stdout}`);
                console.error(`Shell 脚本的错误输出：${stderr}`);
                resolve();
              }
            });
          });
        } catch (error) {
          console.error(error);
        }
    });
}

// function deploy() {
//     const rule = new schedule.RecurrenceRule();
//     // 规定每天的10点11分执行
//     rule.hour = 10; 
//     rule.minute = 11;
//     rule.tz = 'Asia/Shanghai'
//     const job = schedule.scheduleJob(rule, async () => {
//         try {
//           await new Promise((resolve, reject) => {
//             exec(`sh ${scriptPath}`, (error, stdout, stderr) => {
//               if (error) {
//                 reject(`执行 Shell 脚本时出错：${error}`);
//               } else {
//                 console.log(`Shell 脚本的标准输出：${stdout}`);
//                 console.error(`Shell 脚本的错误输出：${stderr}`);
//                 resolve();
//               }
//             });
//           });
//         } catch (error) {
//           console.error(error);
//         }
//     });
// }

scheduleDaily();
// deploy()
