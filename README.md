## 作用

定时获取[GitHub520](https://github.com/521xueweihan/GitHub520)的 Hosts 文件与 GitHub IP 地址列表（通过 meta API 进行，见
[关于 GitHub 的 IP 地址](https://docs.github.com/zh/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses)），并将二者转换为 Clash 的可订阅规则后，上传至腾讯 COS 存储桶。

> 原因：已经订阅了 Loyalsoldier 和 ACL4SSR 等大型规则，但 git 或其他需要使用 GitHub 资源时，IP 地址仍存在漏网之鱼的情况，所以自己动手丰衣足食。

## 食用方法

项目根目录下，创建 `.env` 文件

```
SecretId=''
SecretKey=''
```

下载依赖

```bash
npm i
```

启动

```bash
pm2 start index.js --name gh2cos
```