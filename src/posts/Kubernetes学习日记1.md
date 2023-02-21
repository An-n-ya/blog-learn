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