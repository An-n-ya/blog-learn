---
title: 源码解析-Nacos
description: 分析Nacos功能实现，技术架构
---

## 安装编译Nacos
从[nacos仓库](https://github.com/alibaba/nacos)选择一个release分支（开发分支可能无法编译），进入根目录执行
```shell
mvn -Prelease-nacos -Dmaven.test.skip=true clean install -U
```
编译项目。启动类是`nacos/console/src/main/java/com/alibaba/nacos/Nacos.java`，直接执行它会报错，我们需要设置下vm参数
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230302165231.png)
表示启动单体nacos应用，参考[issue](https://github.com/alibaba/nacos/issues/2902)

设置完这个，我在启动的时候还报了一个错：
Caused by: java.lang.IllegalArgumentException: the length of secret key must great than or equal 32 bytes; And the secret key  must be encoded by base64
似乎是和auth相关，我去`application.properties`里找了下，里边有一个设置secret key的选项：
```properties
#nacos.core.auth.plugin.nacos.token.secret.key=SecretKey012345678901234567890123456789012345678901234567890123456789
nacos.core.auth.plugin.nacos.token.secret.key=
```
我们把上面的打开，把下面的注释掉就可以运行了。