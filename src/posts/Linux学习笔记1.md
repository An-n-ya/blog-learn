---
title: Linux学习笔记（一）--- 编译并调试Linux源码
description: 
---
学习linux必定是要去看linux源码，接下来我们来看看如何调试编译linux源码。

## 下载linux
这个网站保存着linux所有版本的源码：https://cdn.kernel.org/pub/linux/kernel
我选择了比较新的5.19.17版本。
```shell
wget https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-5.19.17.tar.xz
xz -d linux-5.19.17.tar.xz
tar -xvf linux-5.19.17.tar
```

## 编译Linux
进入下载的linux项目文件目录，里面的readme文件推荐我们去看 https://www.kernel.org/doc/html/latest 文档。
官方文档里很贴心的推荐新手去 https://kernelnewbies.org/Linux_Kernel_Newbies 去看看。
而kernelnewbies的faq页面的第一个问题就是如何编译kernel
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230326160320.png)
但是这篇文章写的是如何编译kernel内核替换当前内核，我们希望使用qemu运行编译的内核。
所以我按照[这篇文章](https://wenfh2020.com/2021/05/19/gdb-kernel-networking/)的步骤去做了。

在linux项目根目录执行
```shell
make menuconfig
```
进入图形化界面设置编译选项，为了我们方便调试，需要把这两项选项打开：
```shell
Kernel hacking  --->
     Compile-time checks and compiler options  ---> 
         [*] Compile the kernel with debug info
         [*] Provide GDB scripts for kernel debugging
```
并把这个选项关闭：
```shell
Processor type and features  --->
    [*] Randomize the address of the kernel image (KASLR) 
```

然后就可以编译内核了：
```shell
make -j$(nproc)
```
nproc返回的是电脑CPU的核心数。
后续我们需要用到编译出来的elf内核镜像，因此还需要执行(参考 https://stackoverflow.com/questions/49397856/linux-compilation-error-missing-file-arch-x86-boot-bzimage)
```shell
make bzImage
```
我在执行上述命令的时候出现了`*** No rule to make target 'debian/canonical-certs.pem'`的错误，参考 https://askubuntu.com/questions/1329538/compiling-the-kernel-5-11-11 给出的答案，还需要执行下面两条指令：
```shell
scripts/config --disable SYSTEM_TRUSTED_KEYS
scripts/config --disable SYSTEM_REVOCATION_KEYS
```

## 模拟器运行linux
我们使用《庖丁解牛Linux内核分析》里的menuOS来构建Linux系统
```shell
git clone https://github.com/mengning/menu.git
cd menu
```
修改menu项目下的Makefile文件：
```shell
qemu-system-x86_64 -kernel ../linux-5.19.17/arch/x86/boot/bzImage -initrd ../rootfs.img
```
使用之前编译好的bzImage镜像，这行指令里的`-initrd`表示使用内存根文件系统，正常来说还应当切换到磁盘系统的，但是为了简化，这里只使用了initrd根文件系统。

我们可以看下Makefile的内容，看下menuOS到底做了什么
```shell
	gcc -o init linktable.c menu.c test.c -m32 -static -lpthread
	gcc -o hello hello.c -m32 -static
	find init hello | cpio -o -Hnewc |gzip -9 > ../rootfs.img
```
它是把一系列c文件编译成init文件，然后使用cpio的方式把rootfs下的所有文件打包成一个镜像文件复制到rootfs.img，这个镜像文件的init方法就是linux执行的第一个用户态进程。

然后使用指令
```shell
make rootfs
```
就能打开qemu模拟器启动menuOS了：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230326161648.png)

## 参考资料
使用vscode+qemu调试linux源码  https://howardlau.me/programming/debugging-linux-kernel-with-vscode-qemu.html