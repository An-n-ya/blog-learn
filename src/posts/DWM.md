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



## bar padding
安装这个[patch](https://dwm.suckless.org/patches/barpadding/)
注意： 如果和systray一起用的话，需要修改dwm.c如下

首先是systray使用resizebarwin函数会调用XMoveResizeWindow，所以这里也需要更改
```diff
@@ -1481,7 +1486,7 @@ resizebarwin(Monitor *m) {
        unsigned int w = m->ww;
        if (showsystray && m == systraytomon(m) && !systrayonleft)
                w -= getsystraywidth();
-       XMoveResizeWindow(dpy, m->barwin, m->wx, m->by, w, bh);
+       XMoveResizeWindow(dpy, m->barwin, m->wx + sp, m->by + vp, m->ww - 2 * sp, bh);
 }
```

另外一点是，systray托盘图标可能没有跟随tab移动，需要修改dwm.c
```diff
@@ -2439,8 +2450,8 @@ updatesystray(void)
        }
        w = w ? w + systrayspacing : 1;
        x -= w;
-       XMoveResizeWindow(dpy, systray->win, x, m->by, w, bh);
-       wc.x = x; wc.y = m->by; wc.width = w; wc.height = bh;
+       XMoveResizeWindow(dpy, systray->win, x - sp, m->by + vp, w, bh);
+       wc.x = x - sp; wc.y = m->by + vp; wc.width = w; wc.height = bh;
        wc.stack_mode = Above; wc.sibling = m->barwin;
        XConfigureWindow(dpy, systray->win, CWX|CWY|CWWidth|CWHeight|CWSibling|CWStackMode, &wc);
        XMapWindow(dpy, systray->win);
```
这样就工作正常啦。

## picom
picom是Xorg的一个compositor，简单理解就是用来管理窗口的软件。
我的picom配置参考了： https://www.bilibili.com/video/BV1za411r7v3/?vd_source=96c18635d20f0cc3b2c33ac78719180e

页面切换的动画需要安装这个picom的fork： https://github.com/jonaburg/picom 。这个fork需要安装许多依赖：
```shell
sudo apt install libxext-dev libxcb1-dev libxcb-damage0-dev libxcb-xfixes0-dev libxcb-shape0-dev libxcb-render-util0-dev libxcb-render0-dev libxcb-randr0-dev libxcb-composite0-dev libxcb-image0-dev libxcb-present-dev libxcb-xinerama0-dev libxcb-glx0-dev libpixman-1-dev libdbus-1-dev libconfig-dev libgl1-mesa-dev  libpcre2-dev  libevdev-dev uthash-dev libev-dev libx11-xcb-dev
```



## noborder nogap
在全屏模式下取消border，取消gap，这个功能用 noborder patch实现。
但在装了bar padding后，想在全屏模式下取消barpadding，就需要自己实现了，好在不复杂，可以仿照noborder写
```diff
diff --git a/dwm.c b/dwm.c
index 1f21ae0..0ccf86d 100644
--- a/dwm.c
+++ b/dwm.c
@@ -463,9 +463,16 @@ arrange(Monitor *m)
 void
 arrangemon(Monitor *m)
 {
+       int n = 0;
+       Client *c;
        strncpy(m->ltsymbol, m->lt[m->sellt]->symbol, sizeof m->ltsymbol);
        if (m->lt[m->sellt]->arrange)
                m->lt[m->sellt]->arrange(m);
+       for (n = 0, c = nexttiled(m->clients); c; c = nexttiled(c->next), n++);
+       if ((m->lt[m->sellt]->arrange != monocle && n > 1) || !m->lt[m->sellt]->arrange) {
+               sp = sidepad;
+               vp = (topbar == 1) ? vertpad : -vertpad;
+       }
 }
 
 void
@@ -1295,8 +1302,14 @@ monocle(Monitor *m)
                        n++;
        if (n > 0) /* override layout symbol */
                snprintf(m->ltsymbol, sizeof m->ltsymbol, "[%d]", n);
-       for (c = nexttiled(m->clients); c; c = nexttiled(c->next))
+       for (c = nexttiled(m->clients); c; c = nexttiled(c->next)) {
                resize(c, m->wx, m->wy, m->ww - 2 * c->bw, m->wh - 2 * c->bw, 0);
+               sp = 0;
+               vp = 0;
+               resizebarwin(m);
+               updatesystray();
+       }
+
```
简单来说，就是在检测到全屏模式的时候把`sp`,`vp`设置为零，在退出全屏模式的时候把`sp,vp`还原

## 关闭screen saver
切换到dwm的时候老是遇到一个现象，在有段时间不操作屏幕之后，就会黑屏，得移动下鼠标才能重新开启屏幕。
我一直用 autosleep 作为关键词去搜索，结果啥也没搜到。后来偶然想到应该用“屏幕保护”作为关键词...
搜索后就有结果啦，使用`xset q`查看电脑基本信息，里边就有screen saver：
```shell
Screen Saver:
  prefer blanking:  yes    allow exposures:  yes
  timeout:  600    cycle:  600
```
可以看到，这里的设置就是说10分钟不操作就息屏。
我们用`xset s off`就可以关掉screen saver啦


## S3睡眠
用命令`cat /sys/power/mem_sleep`查看当前系统支持的睡眠模式，我的是这样的：` s2idle [deep]`。这里的deep其实就表明是S3睡眠了。

S3睡眠指的是关闭CPU，只运行DRAM，这样子睡眠后，下次启动电脑就可以直接加载DRAM的内容恢复上次休眠时的状态。
S4睡眠指的是把DRAM缓存到硬盘，下次启动时从硬盘恢复DRAM的内容（这样可以更省点，但是恢复速度会很慢，边际效应很低了）


