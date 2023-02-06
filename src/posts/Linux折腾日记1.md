---
title: Linux折腾日记
description: 记录我的Linux折腾过程
---
## vnc远程桌面
vnc是一个用来分享屏幕的软件，Linux、Windows、MacOS都能用。

### 安装方法
```shell
sudo apt install x11vnc
```
我是用的xOrg，所以装的是`x11vnc`，如果用的是WayLand，就需要装`wayvnc`。

### 设置vnc密码
```shell
x11vnc -storepasswd
```
### 启动vnc服务
```shell
x11vnc -rfbport 5903 -rfbauth ~/.vnc/passwd -forever -bg -repeat -nowf -o ~/.vnc/x11vnc.log
```
从`~/.vnc/x11vnc.log`中可以查看启动日志。我把端口设置成了`5903`

### 连接vnc服务
在MacOS的访达中选择`连接服务器`，快捷键`Command + K`，输入地址`vnc://vncserver-address:5903`，输入密码就能进入了。


### 下一步
目前使用体验不是很好，延迟比较大。考虑增加使用顺畅度。