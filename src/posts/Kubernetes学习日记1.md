---
title: Kubernetes学习日记（一）
description: 搭建Kubernetes环境
---
学习Kubernetes的第一步是先搭建好环境，曾经这是一个老大难的问题，现在有很多工具可以帮助我们快速开启Kubernetes服务，我们甚至可以直接使用云服务提供商提供的Kubernetes环境。

## 腾讯云
腾讯云提供了开箱即用的容器服务，可以在[这里](https://console.cloud.tencent.com/tke2/cluster?rid=1)创建集群，创建完集群后可以获得相应的凭证，把这些凭证放到`~/.kube/config`里，然后就可以用`kubectl`命令访问集群了。

使用腾讯云服务操作简单，不需要手动搭建Kubernetes，不用配置网络，不用调试各种各样奇怪的问题，开箱即用。但是价格有点高，一个月需要一两百块钱，有点不值得，我最后还是选择了本地部署。

## 本地部署
现在本地部署Kubernetes有很多选择，部署过程可以参考[周志明的凤凰架构博客](http://icyfenix.cn/appendix/deployment-env-setup/setup-kubernetes/)。这里只说遇到的一些坑。

- docker的版本需要是最新的。
- minikube 最新的1.29版本会卡住，详情参考这个[issue](https://github.com/kubernetes/minikube/issues/9089)，目前没有解决办法，使用老版本的minukube（比如1.23）就可以了
- 需要注意本地部署的Kubernetes是不能用LoadBalancer暴露服务ip的，可以使用minikube tunnel暴露服务  [参考文档](https://minikube.sigs.k8s.io/docs/handbook/accessing/#using-minikube-tunnel)
