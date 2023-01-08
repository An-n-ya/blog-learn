---
title: DWM折腾日记
description: 记录我的DWM折腾
---

## DWM打开带有emoji的内容就闪退
libxft with bgra patch

## 截图

## 让slstatus显示音量
slstatus默认使用接口(/dev/mixer)比较老，现在的电脑可能用不了，于是可以考虑装一个patch，名字叫[alsa](https://tools.suckless.org/slstatus/patches/alsa/)。
按照安装页面的说明，修改`config.mk`的CPPFLAGS和LDFLAGS。 然后在`config.h`中添加下面的内容:
```
{ vol_perc, "VOL: %s%% | ", "Master"},
```
本来以为一切顺利，结果编译失败，报错：`undefined reference to 'snd_mixer_open'`，即使安装了相关依赖（`sudo apt install libasound2-dev`）还是报错

后来发现StackOverflow上的人说需要把 -lasound 的option放到gcc的最后就行了（还有这么奇怪的操作），我将信将疑的采用了这个hack，去到`Makefile`文件里更改了:
```makefile
- $(CC) -o $@ $(LDFLAGS) $(COM:=.o) $(REQ:=.o) slstatus.o $(LDLIBS)
+ $(CC) -o $@ $(COM:=.o) $(REQ:=.o) slstatus.o $(LDLIBS) $(LDFLAGS) 
```
然后`sudo make clean && make`结果真的编译成功了...