"use strict";

const CERT_PREFIX = "devs-acme-generated-";
const CERT_WILDCARD_PREFIX = "devs-acme-generated-w-";

const FC20230330 = require("@alicloud/fc20230330");
const cas20200407 = require("@alicloud/cas20200407");
const OpenApi = require("@alicloud/openapi-client");
const Util = require("@alicloud/tea-util");
const Stream = require("@alicloud/darabonba-stream");
const _ = require("lodash");
const runtime = new Util.RuntimeOptions({});
const CERT_GENERATOR_FUNCTION_NAME = process.env.CERT_GENERATOR_FUNCTION_NAME;

function getFcClient(regionId, context) {
  return new FC20230330.default(
    new OpenApi.Config({
      accessKeyId: context.credentials.accessKeyId,
      accessKeySecret: context.credentials.accessKeySecret,
      securityToken: context.credentials.securityToken,
      endpoint: `${context.accountId}.${regionId}${regionId === context.region ? "-internal" : ""
        }.fc.aliyuncs.com`,
      readTimeout: 1000000,
      connectTimeout: 1000000,
    })
  );
}

function getCasClient(context) {
  return new cas20200407.default(
    new OpenApi.Config({
      accessKeyId: context.credentials.accessKeyId,
      accessKeySecret: context.credentials.accessKeySecret,
      securityToken: context.credentials.securityToken,
      endpoint: "cas.aliyuncs.com",
      readTimeout: 1000000,
      connectTimeout: 1000000,
    })
  );
}

function checkIfLessThanSevenDays(endTime) {
  var date = new Date(endTime);
  if (Date.parse(date) / 1000 < new Date().getTime() / 1000 + 7 * 24 * 60 * 60) {
    return true;
  }
  return false;
}

async function getCertByName(certName, context) {
  const client = getCasClient(context);
  let currentPage = 1;
  const showSize = 1000;
  let stop = false;

  while (!stop) {
    console.log(`正在查询 ${certName} 第${currentPage}页证书信息`);

    try {
      const response = await client.listUserCertificateOrderWithOptions(
        new cas20200407.ListUserCertificateOrderRequest({
          orderType: "UPLOAD",
          showSize: showSize,
          currentPage: currentPage
        }),
        {},
        runtime
      );
      for (const cert of response.body.certificateOrderList) {
        if (cert.name === certName) {
          const certDetailResponse = await client.getUserCertificateDetailWithOptions(
            new cas20200407.GetUserCertificateDetailRequest({
              certId: cert.certificateId
            }),
            runtime
          );
          console.log(`查询到证书: ${certDetailResponse.body.name} id信息: ${certDetailResponse.body.id}`);
          return certDetailResponse.body;
        }
      }
      if (response.body.totalCount <= currentPage * showSize) {
        console.log(`已查询完所有证书，未找到名称为 ${certName} 的证书`);
        stop = true;
      } else {
        currentPage += 1;
      }
    } catch (error) {
      console.error('Error fetching certificate:', error);
      return null;
    }
  }
  return null;
}

async function checkIfValidDomain(domainName, context) {
  return true;
}

function isWildcardMatch(certCommon, domainName) {
  // 如果是泛域名，则进行正则匹配
  if (certCommon.startsWith('*.')) {
    const wildcardRegex = new RegExp('^[\w-]+\.' + certCommon.slice(2).replace(/\./g, '\\.') + '$');
    return wildcardRegex.test(domainName);
  }
  // 如果不是泛域名，则直接比较
  return certCommon === domainName;
}

async function fetchCertAutoUpdate(domainName, certName, context) {
  const cert = await getCertByName(certName, context);
  if (cert != null) {

    // 使用泛域名匹配函数
    if (!isWildcardMatch(cert.common, domainName)) {
      throw new Error(`Domain name (${domainName}) and certificate common name (${cert.common}) do not match`);
    }

    console.log(`检查证书:  ${certName}`);

    var certificateId = ''
    if (checkIfLessThanSevenDays(cert.endDate)) {
      console.log(`证书 ${cert.common} 即将 ${cert.endDate}过期，更新证书`);
      certificateId = cert.id;
    } else {
      console.log(`证书 ${cert.common} ${cert.endDate} 过期，无需更新`);
      return cert;
    }

  }

  checkIfValidDomain(domainName, context);

  return createAndUploadCert(domainName, certName, certificateId, context);
}


function generateRandomString(length) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function getCertName(domainName, certName) {
  if (certName === null || certName === undefined) {
    if (domainName.startsWith("*.")) {
      const tokens = domainName.split(".");
      return (
        CERT_WILDCARD_PREFIX +
        String(tokens.length) +
        "-" +
        generateRandomString(8)
      );
    } else {
      return CERT_PREFIX + generateRandomString(8);
    }
  } else {
    return certName;
  }
}

async function createAndUploadCert(domainName, certName, certId, context) {
  const fcClient = getFcClient(context.region, context);
  const casClient = getCasClient(context);

  const resp = await fcClient.invokeFunctionWithOptions(
    CERT_GENERATOR_FUNCTION_NAME,
    new FC20230330.InvokeFunctionRequest({
      body: Stream.default.readFromString(
        JSON.stringify({
          domainName,
        })
      ),
    }),
    new FC20230330.InvokeFunctionHeaders({
      xFcInvocationType: "Sync",
    }),
    new Util.RuntimeOptions({})
  );

  if (!resp.headers["x-fc-error-type"]) {
    const result = await Util.default.readAsJSON(resp.body);
    var key = result['key'];
    var cert = result['cert'];

    try {
      if (certId != null) {
        await casClient.deleteUserCertificateWithOptions(
          new cas20200407.DeleteUserCertificateRequest({
            certId: certId
          }),
          runtime
        );
      }
      const newCert = await casClient.uploadUserCertificateWithOptions(
        new cas20200407.UploadUserCertificateRequest({
          name: certName,
          cert: cert,
          key: key
        }),
        runtime
      );
      const certInfo = await casClient.getUserCertificateDetailWithOptions(
        new cas20200407.GetUserCertificateDetailRequest({
          certId: newCert.body.certId,
        }),
        runtime
      );
      console.log(`新证书信息: certInfo ${certInfo.body.common}`);
      return certInfo.body
    } catch (error) {
      console.error('获取新证书失败', error);
      return null;
    }
  } else {
    throw new Error(`Failed to Create cert ${certName}`);
  }
}

async function forceUpdateCustomDomain(domainName, customDomain, context) {
  console.log(`force update ${domainName} 自定义域名:${JSON.stringify(customDomain.domainName)}`);
  var certName = customDomain.certConfig.certName;
  if (certName == null) {
    // certName = domainName.replace(/\./g, '_');
    certName = getCertName(domainName, certName);
    console.log(`新证书名为: certName: ${certName}`);
  }
  const certInfo = await fetchCertAutoUpdate(domainName, certName, context);
  if (certInfo) {
    if (customDomain.domainName == certInfo.common) {
      if (customDomain.certConfig.certConfig == certInfo.cert) {
        console.log(
          `No need to update ${customDomain.domainName} because it already has the latest cert`
        );
        return;
      } else {
        console.log(`Updating ${customDomain.domainName} with new cert ${certName}`);
        await updateCustomDomain(customDomain, certName, certInfo, context);
        return;
      }
    } else {
      throw new Error(`domainName: ${domainName} and cert common: ${cert.common} do not match`);
    }
  } else {
    throw new Error(`Failed to check cert ${certName}`);
  }
}

async function listCustomDomains(regionId, allDomain, context) {
  const client = getFcClient(regionId, context);
  let nextToken = "";
  let stop = false;
  const out = [];
  while (!stop) {
    const result = await client.listCustomDomainsWithOptions(
      new FC20230330.ListCustomDomainsRequest({
        nextToken,
        limit: 100,
      }),
      {},
      runtime
    );
    out.push(
      ...result.body.customDomains.filter((customDomain) => {
        const { protocol, certConfig } = customDomain;
        if (allDomain) {
          customDomain.regionId = regionId;
          return true;
        } else {
          if (
            protocol.toLocaleLowerCase().includes("https") &&
            certConfig.certName.startsWith(CERT_PREFIX)
          ) {
            customDomain.regionId = regionId;
            return true;
          } else {
            return false;
          }
        }
      })
    );
    if (result.body.nextToken) {
      nextToken = result.body.nextToken;
    } else {
      stop = true;
    }
  }
  return out;
}

async function updateCustomDomain(customDomain, certName, certInfo, context) {
  await getFcClient(
    customDomain.regionId,
    context
  ).updateCustomDomainWithOptions(
    customDomain.domainName,
    new FC20230330.UpdateCustomDomainRequest({
      body: new FC20230330.UpdateCustomDomainInput({
        certConfig: new FC20230330.CertConfig({
          certName,
          certificate: certInfo.cert,
          privateKey: certInfo.key,
        }),
        protocol: "HTTPS",
      }),
    }),
    {},
    runtime
  );
  console.log(`update ${customDomain.domainName} success`);
}

async function updateCustomDomains(certName, customDomains, context) {

  const domainNames = _.uniq(
    customDomains.map((customDomain) => customDomain.domainName)
  );

  let domainName = domainNames[0];

  if (domainNames.length > 1) {
    if (certName.startsWith(CERT_WILDCARD_PREFIX)) {
      const wildcardPosition = Number(certName.split("-")[4]);
      domainName = `*.${domainName
        .split(".")
        .slice(-1 * (wildcardPosition - 1))
        .join(".")}`;
    }
  }

  const certInfo = await fetchCertAutoUpdate(domainName, certName, context);

  if (certInfo) {
    await Promise.all([
      ...customDomains
        .filter((customDomain) => {
          if (customDomain.certConfig.certificate !== certInfo.cert) {
            return true;
          } else {
            console.log(
              `No need to update ${customDomain.domainName} because it already has the latest cert`
            );
            return false;
          }
        })
        .map((customDomain) =>
          updateCustomDomain(customDomain, certName, certInfo, context)
        ),
    ]);
  } else {
    throw new Error(`Failed to check cert ${certName}`);
  }
}

exports.handler = async (event, context, callback) => {
  let eventJson = JSON.parse(event);
  console.log("event:", eventJson);
  let domainName = eventJson["domainName"];
  let out = await Promise.all(
    process.env.CUSTOM_DOMAIN_REGIONS.split(",").map((regionId) =>
      listCustomDomains(regionId, (domainName != null), context)
    )
  );
  out = out.flat();
  if (domainName) {
    let customDomain = out.find((element) => element.domainName === domainName);
    if (customDomain) {
      await forceUpdateCustomDomain(domainName, customDomain, context);
    } else {
      console.log(`No custom domain ${domainName} found`);
    }
  } else {
    const map = {};
    out.forEach((c) => {
      const certName = c.certConfig.certName;
      if (map[certName]) {
        map[certName].push(c);
      } else {
        map[certName] = [c];
      }
    });

    const requests = [];
    if (Object.keys(map).length === 0) {
      console.log("no fc-certbot app created certs found");
    }
    Object.keys(map).forEach(async (certName) => {
      const customDomains = map[certName];
      console.log(
        `found cert ${certName} is used by custom domains: ${customDomains
          .map((c) => c.domainName)
          .join(", ")}.`
      );
      requests.push(updateCustomDomains(certName, customDomains, context));
    });
    await Promise.all(requests);
  }

  callback(null, "done");
};