---
title: Kubernetes学习日记（一）
description: 搭建Kubernetes环境
---
学习Kubernetes的第一步是先搭建好环境，曾经这是一个老大难的问题，现在有很多工具可以帮助我们快速开启Kubernetes服务，我们甚至可以直接使用云服务提供商提供的Kubernetes环境。

## 腾讯云容器服务
腾讯云提供了开箱即用的容器服务，可以在[这里](https://console.cloud.tencent.com/tke2/cluster?rid=1)创建集群，创建完集群后可以获得相应的凭证，把这些凭证放到`~/.kube/config`里，然后就可以用`kubectl`命令访问集群了。

使用腾讯云服务操作简单，不需要手动搭建Kubernetes，不用配置网络，不用调试各种各样奇怪的问题，开箱即用。但是价格有点高，一个月需要一两百块钱，有点不值得，我最后还是选择了本地部署。

## 本地部署
现在本地部署Kubernetes有很多选择，部署过程可以参考[周志明的凤凰架构博客](http://icyfenix.cn/appendix/deployment-env-setup/setup-kubernetes/)。这里只说遇到的一些坑。

- docker的版本需要是最新的。
- minikube 最新的1.29版本会卡住，详情参考这个[issue](https://github.com/kubernetes/minikube/issues/9089)，目前没有解决办法，使用老版本的minukube（比如1.23）就可以了
- 需要注意本地部署的Kubernetes是不能用LoadBalancer暴露服务ip的，可以使用minikube tunnel暴露服务  [参考文档](https://minikube.sigs.k8s.io/docs/handbook/accessing/#using-minikube-tunnel)
`

## 腾讯云轻量应用服务器手动部署
云服务提供商的容器服务太贵了，但是轻量应用服务器价格还算便宜，如果买的是国外的服务器，就不用担心拉取不到镜像这样的网络问题了，还能附带搭个梯子，岂不美哉。
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230221211332.png)
腾讯云新加坡轻量云服务器一个月只需要32元，部署一个两个节点的集群一个月只需要64元。

### 主节点部署
1. 选择一个服务器作为主节点，先安装docker
```shell
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

2. 我选的是ubuntu系统，所以要先注册apt-key
```shell
sudo curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
sudo add-apt-repository "deb https://apt.kubernetes.io/ kubernetes-xenial main"
sudo apt-get update
```

3. 安装kubelet、kubeadm、kubectl
```shell
sudo apt install kubelet kubeadm kubectl
```

4. 关闭swap（k8s用于保证安全性、节点一致性的关键，不落盘）
```shell
sudo swapoff -a
```

5. 初始化集群控制平面
```shell
sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address 43.153.202.41
```
后面的`--pod-network-cidr`是用来给`Flannel`做网络分段的

6. 安装CNI插件
k8s默认的网络通讯方式设置起来很复杂，我们使用CNI插件来实现容器之间的网络通讯。
CNI插件you和诺，Flannel部署起来比较方便，我就选了这个：
```shell
curl --insecure -sfL https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml | kubectl apply -f -
```

7. 移除Master节点上的污点
如果现在在主节点上运行一个pod，会一直卡在pending，原因是k8s不希望在主节点上运行容器，这时候就需要移除Master节点上的所有污点：
```shell
kubectl taint nodes --all node-role.kubernetes.io/[role]-
```
上面指令中有个参数`role`，这个参数需要从`kubectl get nodes`中的role列获得，有时候是`master`有时候是`control panel`。

### 从节点部署
从节点部署比较简单，可以只执行上一小节的 1~3 步，然后使用下面的指令加入集群：
```shell
kubeadm join 10.3.7.5:6443 --token ejg4tt.xxxx \
    --discovery-token-ca-cert-hash sha256:xxxx
```
这里有两个token，可以在主节点运行`kubeadm token create --print-join-command`获得。

另外有一点需要注意，需要在主节点的安全组中放行k8s用到的一些端口，如下：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230221100028.png)
参考的[这里](https://github.com/kubesphere/kubekey/blob/master/docs/network-access.md)


### 远程连接集群
一直在ssh里操作怪难受的，通过本地连接远程集群操作比较方便。在主节点上执行
```shell
kubectl config view --flatten
```
注意，后面的flatten很关键，不然拿不到pem

直接使用上面的指令其实是不能远程连接的，因为 Kubeconfig 文件中 APIServer 的地址是内网 ip，我们需要把公网ip签到证书里去

1. 设置ClusterConfiguration
登录主节点，进入`/etc/kubernetes`，添加`kubeadm-config.yaml`，这个configuration文件可以参考[官方文档](https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/)，写入一下配置：
```yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
etcd:
  external:
    endpoints:
    - https://192.168.0.8:2379
apiServer:
  extraArgs:
    authorization-mode: Node,RBAC
  timeoutForControlPlane: 4m0s
  certSANs:
    - 10.0.0.5
    - 10.96.0.1
    - xxxxxxxxx
```
在最后补上外网ip就好。

2. 备份先前的公钥私钥
进入到`/etc/kubernetes/pki`
执行这两条命令备份：`sudo mv apiserver.crt apiserver.crt-bak`   `sudo mv apiserver.key apiserver.key-bak`

3. 将公网ip添加到apiserver
```shell
sudo kubeadm init phase certs apiserver --config kubeadm-config.yaml
```

4. 检查apiserver中是否包含公网ip
```shell
sudo openssl x509 -in pki/apiserver.crt -noout -text | grep xxxxxxx
```


5. 重启apiserver
有时候可能需要重启apiserver才能生效，直接删除apiserver pod，然后等待kubelet重新拉起就好。
先查看apiserver的pod名
```shell
kubectl get pods --all-namespaces
```
输出如下：
```
NAMESPACE      NAME                                    READY   STATUS    RESTARTS   AGE
kube-flannel   kube-flannel-ds-khm2m                   1/1     Running   0          27m
kube-flannel   kube-flannel-ds-t4m5c                   1/1     Running   0          10m
kube-system    coredns-787d4945fb-5m77v                1/1     Running   0          36m
kube-system    coredns-787d4945fb-wnrc2                1/1     Running   0          36m
kube-system    etcd-vm-0-5-ubuntu                      1/1     Running   2          37m
kube-system    kube-apiserver-vm-0-5-ubuntu            1/1     Running   2          14m
kube-system    kube-controller-manager-vm-0-5-ubuntu   1/1     Running   2          37m
kube-system    kube-proxy-t4k4b                        1/1     Running   0          10m
kube-system    kube-proxy-z9xds                        1/1     Running   0          36m
kube-system    kube-scheduler-vm-0-5-ubuntu            1/1     Running   3          37m
```
然后删除apiserver就好
```shell
kubectl delete pod kube-apiserver-vm-0-5-ubuntu -n kube-system
```


6. 远程连接
这时候再执行`kubectl config view --flatten`，复制到本地就可以连接啦。


### 参考：
- 博客 https://kubesphereio.com/post/add-public-ip-to-kubernetes-apiserver-operation-guide/
- 官方文档 https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/



## 把本地节点部署到远程k8s集群
k8s增加节点需要在内网进行，本地节点和远程服务器不属于同一个内网，本应该是不能组集群的。但是没有条件可以创造条件，我们可以使用[openvpn](https://openvpn.net/)这样的技术将本地节点和远程节点组局域网，这样就可以把本地节点放到远程集群上了。集群可以享受到本地节点更高的服务器配置，而本地节点可以享受到远程节点的带宽。
有了本地节点的加入，整个集群的运算力、存储资源一下子就上来了，能很大程度上缓解我的资源焦虑了哈哈哈。

### 部署openvpn
在远程节点上部署openvpn，有两种方案：
- 参考官方部署教程 https://openvpn.net/vpn-software-packages/ubuntu/
- 使用自动化部署脚本 https://github.com/hwdsl2/openvpn-install
我比较喜欢第二种方案，很省事。分为三步
1. 安装脚本
```shell
wget -O openvpn.sh https://get.vpnsetup.net/ovpn
```
2. 执行脚本安装openvpn
```shell
sudo bash openvpn.sh --auto
```
3. 添加客户端
再次执行`sudo bash openvpn.sh`，会进入一个选择项，选择添加新client，然后就能得到一个`xxx.ovpn`文件，把这个文件复制到本地节点。

### 设置openvpn客户端
在把`.ovpn`文件复制到本地后就可以准备连接远程服务器了。参考[openvpn安装手册](https://community.openvpn.net/openvpn/wiki/OpenVPN3Linux?_gl=1*149lgkg*_ga*NTQzMTc2NDUwLjE2NzcyMjk3OTU.*_ga_SPGM8Y8Y79*MTY3NzI0ODIxMy4zLjEuMTY3NzI0ODIxOC41NS4wLjA.&_ga=2.263351436.106169158.1677229796-543176450.1677229795)安装openvpn客户端：

#### centos安装步骤
1. 安装[copr](https://copr.fedorainfracloud.org/)，copr是一个包的自动构建系统
```shell
sudo yum install yum-plugin-copr
```
2. 配置openvpn的copr
```shell
sudo yum copr enable dsommers/openvpn3
```
3. 安装openvpn
```shell
sudo yum install openvpn3-client
```
上面的步骤会安装两个版本的openvpn:`openvpn2`和`openvpn3`，我们使用`openvpn3`就好。
1. 添加`.ovpn`配置文件
```shell
openvpn3 config-import --config my.ovpn
```
2. 启动openvpn session服务
```shell
openvpn3 session-start --config my.ovpn
```
经过上面的步骤就完成了本地节点到远程节点的局域网组建了。可以在本地看看能不能ping通远程节点:
```shell
ping 10.0.0.5
```
如果能ping通，就说明配置成功。

#### ubuntu安装步骤
ubuntu这边需要添加gpg文件，我在尝试的时候总是连不上`openvpn`的网络，搭了梯子也不行...
无奈最后用手动的方式添加了各种gpg文件。
先查看下22.04的list:
```shell
curl -fsSL https://swupdate.openvpn.net/community/openvpn3/repos/openvpn3-jammy.list
```
然后把上面得到的结果复制到`/etc/apt/sources.list.d/openvpn3.list`。
然后是查看openvpn的pub文件
```shell
curl -fsSL https://swupdate.openvpn.net/repos/openvpn-repo-pkg-key.pub
```
然后把上面的结果复制到`/etc/apt/trusted.gpg.d/openvpn-repo-pkg-keyring.gpg`。
之后就可以安装openvpn了:`sudo apt update && sudo apt install openvpn`

连接远程节点：`openvpn --config xxxx.ovpn`


### 将本地节点并入k8s集群
组建好局域网后就可以组k8s集群了。
1. 在master节点执行：`kubeadm token create --print-join-command`
2. 将上面的执行结果放到本地节点执行即可
3. 查看节点情况：`kubectl get nodes`



### 踩的一些坑
#### [ERROR CRI]: container runtime is not running: 
```shell
sudo rm -rf /etc/containerd/config.toml
sudo systemctl restart containerd
```

#### Failed to create pod sandbox: open /run/systemd/resolve/resolv.conf: no such file or directory
flannel pod 一直启动不了，日志里报了这样的错误。
宿主机的kubectl在启动一个pod的时候需要为pod创建一个合适的运行环境，这个运行环境中就包括了dns配置，而dns的默认配置文件在`/run/systemd/resolve/resolv.conf`，需要使用`systemd-resolved`。
但是我的本地节点上似乎没有安装`systemd-resolved`，于是使用`sudo yum -y install systemd-resolved`安装后就没有问题了。


#### 防火墙端口问题
在加入集群的时候报错无法连接`my-ip:10248`，去master节点把10248端口打开就好了