---
title: DWM折腾日记
description: 记录我的DWM折腾
---

## 让软件固定在某个tag打开
下图的patch让obsidian只能运行在9号tag上
```diff
static const Rule rules[] = {
	/* xprop(1):
	 *	WM_CLASS(STRING) = instance, class
	 *	WM_NAME(STRING) = title
	 */
	/* class      instance    title       tags mask     isfloating   monitor */
	{ "Gimp",	  NULL,   NULL,		0,		1,	 -1 },
+	{ "obsidian",      NULL,   NULL,	1 << 8,		0,	 -1 },
	{ NULL,		  "spterm",		NULL,		SPTAG(0),		1,			 -1 },
	{ NULL,		  "spfm",		NULL,		SPTAG(1),		1,			 -1 },
};
```

## DWM打开带有emoji的内容就闪退
一开始在用firefox安装插件的时候老是闪退，以为是firefox的问题，后来在打开obsidian的时候也闪退，于是意识到可能是dwm的问题，上网一搜原来是emoji的问题。
参考这篇文章在ubuntu上安装libxft的patch [libxft with bgra patch](https://www.maximilian-schillinger.de/articles/st-libxft-bgra-patch.html)
dwm和st都需要打上这个patch。安装过程如下：
### 安装libxft-gbra
```shell
git clone https://gitlab.freedesktop.org/xorg/lib/libxft.git
cd libxft
git checkout libXft-2.3.6
sudo apt install build-essential libtool pkg-config libxrender-dev libfreetype6-dev libfontconfig1-dev xutils-dev
sh autogen.sh --sysconfdir=/etc --prefix=/usr --mandir=/usr/share/man
make
```
### 改变libxft的链接
安装完libxft-gbra后，还需要改变编译选项，让链接器选择我们新安装的libxft。在`config.mk`中做出如下更改
```diff
diff --git a/config.mk b/config.mk
index c070a4a..4920ec9 100644
--- a/config.mk
+++ b/config.mk
@@ -7,8 +7,8 @@ VERSION = 0.8.4
 PREFIX = /usr/local
 MANPREFIX = $(PREFIX)/share/man

-X11INC = /usr/X11R6/include
-X11LIB = /usr/X11R6/lib
+X11INC = /home/ankh/libxft/include
+X11LIB = /home/ankh/libxft/src/.libs

 PKG_CONFIG = pkg-config

@@ -23,7 +23,7 @@ LIBS = -L$(X11LIB) -lm -lrt -lX11 -lutil -lXft \
 # flags
 STCPPFLAGS = -DVERSION=\"$(VERSION)\" -D_XOPEN_SOURCE=600
 STCFLAGS = $(INCS) $(STCPPFLAGS) $(CPPFLAGS) $(CFLAGS)
-STLDFLAGS = $(LIBS) $(LDFLAGS)
+STLDFLAGS = -Xlinker -rpath=$(X11LIB) $(LIBS) $(LDFLAGS)

 # OpenBSD:
 #CPPFLAGS = -DVERSION=\"$(VERSION)\" -D_XOPEN_SOURCE=600 -D_BSD_SOURCE
```
### 编译安装
使用`make`命令编译得到可执行文件`dwm`，用`ldd`工具查看链接情况:
```bash
$ ldd ./st
        linux-vdso.so.1 (0x00007fffc413f000)
        libX11.so.6 => /lib/x86_64-linux-gnu/libX11.so.6 (0x00007f98204b1000)
        libutil.so.1 => /lib/x86_64-linux-gnu/libutil.so.1 (0x00007f98204ac000)
        libXft.so.2 => /home/ankh/repos/libxft/src/.libs/libXft.so.2 (0x00007f9820492000)
        ...
```
可以发现已经 libXft.so.2 已经链接到我们自己的库里了。

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




