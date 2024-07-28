from flask import Flask, Response
from flask import request
import os
import subprocess
import json

REQUEST_ID_HEADER = 'x-fc-request-id'

app = Flask(__name__)

# 安装 acme
@app.route('/initialize', methods=['POST'])
def init_invoke():
    rid = request.headers.get(REQUEST_ID_HEADER)
    print("FC Initialize Start RequestId: " + rid)
    # do your things
    if not os.path.exists("acme-home"):
        # 下载仓库
        os.system(
            "git clone https://github.com/acmesh-official/acme.sh.git")
        # 装载
        os.system(
            "cd acme.sh && bash acme.sh --install  \
            --home acme-home \
            --accountemail  \"my@example.com\" \
            --nocron")
    if not os.path.exists("/mnt/auto/nginx"):
        # 证书输出位置
        os.system("mkdir -p /mnt/auto/nginx")
    print("FC Initialize End RequestId: " + rid)
    return "OK", 200, []

# 默认路由
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def hello_world(path):
    rid = request.headers.get(REQUEST_ID_HEADER)
    print("FC Invoke Start RequestId: " + rid)
    data = request.stream.read()
    print("Path: " + path)
    print("Data: " + str(data))
    print("FC Invoke End RequestId: " + rid)
    return "Hello, World!"

# 颁发证书
@app.route('/invoke', methods=['POST'])
def invoke_acme():
    body = request.get_data()
    if body is None or body == "":
        return "not found post body", 400, []
    info = json.loads(body)
    domain = info["domainName"]
    print(domain)
    # 获取 DNS 平台, 默认 dns_ali
    if "DNS_TYPE" in os.environ:
        dnstype = os.environ['DNS_TYPE']
    else:
        dnstype = "dns_ali"
        # 设置域名服务器环境变量
        # os.environ["Ali_Key"]=''
        # os.environ["Ali_Secret"]=''
    try: 
        issue_command = f"acme-home/acme.sh --issue --server letsencrypt --dns {dnstype} -d {domain} -k 2048"
        print(issue_command)
        # 颁发证书
        subprocess.run(issue_command, shell=True, check=True)
        install_command = f"acme-home/acme.sh --install-cert -d {domain} --key-file /mnt/auto/nginx/{domain}_key.pem --fullchain-file /mnt/auto/nginx/{domain}_cert.pem"
        print(install_command)
        # 创建证书目录
        os.makedirs('/mnt/auto/nginx', exist_ok=True)
        # 导出
        subprocess.run(install_command, shell=True, check=True)
        # 证书信息
        with open(f'/mnt/auto/nginx/{domain}_key.pem', 'r') as keyfile:
            key = keyfile.read()

        with open(f'/mnt/auto/nginx/{domain}_cert.pem', 'r') as certfile:
            cert = certfile.read()
            
        acmedic = {
            "key": str(key),
            "cert": str(cert)
        }
        return Response(json.dumps(acmedic), mimetype='application/json')
    except Exception as e:
        return f"Error: {str(e)}", 500, []

# main 函数
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9000)
