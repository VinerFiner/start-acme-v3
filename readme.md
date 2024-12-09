> 注：当前项目为 Serverless Devs 应用，由于应用中会存在需要初始化才可运行的变量（例如应用部署地区、函数名等等），所以**不推荐**直接 Clone 本仓库到本地进行部署或直接复制 s.yaml 使用，**强烈推荐**通过 `s init ${模版名称}` 的方法或应用中心进行初始化，详情可参考[部署 & 体验](#部署--体验) 。

# start-acme-v3 帮助文档

<p align="center" class="flex justify-center">
    <a href="https://www.serverless-devs.com" class="ml-1">
    <img src="http://editor.devsapp.cn/icon?package=start-acme-v3&type=packageType">
  </a>
  <a href="http://www.devsapp.cn/details.html?name=start-acme-v3" class="ml-1">
    <img src="http://editor.devsapp.cn/icon?package=start-acme-v3&type=packageVersion">
  </a>
  <a href="http://www.devsapp.cn/details.html?name=start-acme-v3" class="ml-1">
    <img src="http://editor.devsapp.cn/icon?package=start-acme-v3&type=packageDownload">
  </a>
</p>

<description>

快速部署一个 Custom Container 的 Hello World 函数到阿里云函数计算。

</description>

<codeUrl>

- [:smiley_cat: 代码](https://github.com/VinerFiner/start-acme-v3)

</codeUrl>
<preview>

</preview>

## 前期准备

使用该项目，您需要有开通以下服务并拥有对应权限：

<service>

| 服务/业务 | 权限               |
| --------- | ------------------ |
| 函数计算  | AliyunFCFullAccess |
| NDS权限  | AliyunDNSFullAccess |

</service>

<remark>

</remark>

<disclaimers>

</disclaimers>

## 部署 & 体验

<appcenter>

- :fire: 通过 [Serverless 应用中心](https://fcnext.console.aliyun.com/applications/create?template=start-acme-v3) ，
  [![Deploy with Severless Devs](https://img.alicdn.com/imgextra/i1/O1CN01w5RFbX1v45s8TIXPz_!!6000000006118-55-tps-95-28.svg)](https://fcnext.console.aliyun.com/applications/create?template=start-acme-v3) 该应用。

</appcenter>
<deploy>

- 通过 [Serverless Devs Cli](https://www.serverless-devs.com/serverless-devs/install) 进行部署：
  - [安装 Serverless Devs Cli 开发者工具](https://www.serverless-devs.com/serverless-devs/install) ，并进行[授权信息配置](https://docs.serverless-devs.com/fc/config) ；
  - 初始化项目：`s init start-acme-v3 -d acme-v3`
  - 进入项目，并进行项目部署：`cd acme-v3 && s deploy -y`

## 使用文档

<usedetail id="flushContent">

1. 部署成功后，请找到部署在杭州地域的 `fc-domain-manager` 函数。并进入函数详情页面。
2. 点击“代码”页签中，“测试函数”旁边的下拉按钮，并点击“配置测试参数”。
  ![config](https://img.alicdn.com/imgextra/i3/O1CN018m9BmT1VBig71p3on_!!6000000002615-0-tps-672-554.jpg)
3. 输入您的要生成证书的域名的 JSON 内容，并点击“确定”。
   ```
      {
          "domainName": "abc.mydomain.com"
      }
    ```
    提示：支持通配符域名。
    ```
      {
          "domainName": "*.mydomain.com"
      }
    ```
   ![config](https://img.alicdn.com/imgextra/i3/O1CN01tbCzNf1Rm7hEBvpPZ_!!6000000002153-0-tps-1792-1612.jpg)
4. 点击“测试”来调用函数，并生成域名。
   ![config](https://img.alicdn.com/imgextra/i4/O1CN018es5JV1bB9t7GM8RG_!!6000000003426-0-tps-672-420.jpg)
5. 应用将使用 acme 通过 Let's Encrypt 生成证书，并将此证书上传到[数字证书管理服务](https://yundun.console.aliyun.com/?p=cas#/certExtend/upload/cn-hangzhou)。
6. 您可以在函数计算自定义域名创建或编辑页面中使用此证书。
   ![config](https://img.alicdn.com/imgextra/i2/O1CN010mXNqs1khyoTsmBoS_!!6000000004716-0-tps-1556-1198.jpg)
7. 每天凌晨，此应用会遍历您的函数计算自定义域名。在发现此应用生成的证书后，将自动检查证书的有效期，如果证书将在 7 天内过期，会更换证书，并更新函数计算自定义域名的证书配置。

</usedetail>

> 同类型应用 [https://github.com/devsapp/fc-certbot](https://github.com/devsapp/fc-certbot)

</deploy>

<devgroup>

## 开发者社区

您如果有关于错误的反馈或者未来的期待，您可以在 [Serverless Devs repo Issues](https://github.com/serverless-devs/serverless-devs/issues) 中进行反馈和交流。如果您想要加入我们的讨论组或者了解 FC 组件的最新动态，您可以通过以下渠道进行：

<p align="center">

| <img src="https://serverless-article-picture.oss-cn-hangzhou.aliyuncs.com/1635407298906_20211028074819117230.png" width="130px" > | <img src="https://serverless-article-picture.oss-cn-hangzhou.aliyuncs.com/1635407044136_20211028074404326599.png" width="130px" > | <img src="https://serverless-article-picture.oss-cn-hangzhou.aliyuncs.com/1635407252200_20211028074732517533.png" width="130px" > |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| <center>微信公众号：`serverless`</center>                                                                                         | <center>微信小助手：`xiaojiangwh`</center>                                                                                        | <center>钉钉交流群：`33947367`</center>                                                                                           |

</p>
</devgroup>

<testEvent>
</testEvent>
