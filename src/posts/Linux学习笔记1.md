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

### menuOS
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

### debian
只是运行menuOS好像还差点意思，我们其实可以很方便的制造一个最小文件系统，下面是制作一个debian文件系统的过程：
1. 安装必要的软件：
```shell
sudo apt install genext2fs
sudo apt install debootstrap
```
`genext2fs`用来制作ext2镜像，而`debootstrap`则用来安装一个基本的Debian系统到文件夹。简单来说，debootstrap负责生成一个操作系统必要的一些软件、环境，并把它们分门别类的放到`var, ext, usr`等等这样的文件夹里，然后genest2fs负责把这个文件夹打包生成一个img文件。

2. 使用debootstrap生成debian基础系统文件
```shell
boot sudo debootstrap stable debian http://deb.debian.org/debian
```
上面的指令执行完后会在当前目录生成一个debian目录，里边就是一个最基础的操作系统目录结构
```shell
➜  cd debian/                                                                            (base)
➜  ls                                                                                  (base)
bin@   debootstrap/  etc/   lib@    lib64@   media/  opt/   root/  sbin@  sys/  usr/
boot/  dev/          home/  lib32@  libx32@  mnt/    proc/  run/   srv/   tmp/  var/
```
在debian目录中执行`sudo chroot .`可以进入这个mini“debian系统”，在该系统下设置用户密码`passwd root`，设置好后执行`exit`退出来就好。

3. 使用genext2fs制作镜像
```shell
sudo genext2fs -b 524256 -d ./debian/ rootfs.img
``` 
这里`-b`表示生成的镜像大小（单位为MB），我这里设置的是512M，`-d`选项设置需要制作镜像的目录，rootfs.img就是生成的镜像文件。

我们需要给rootfs.img设置合适的权限。

4. 使用qemu运行
```shell
qemu-system-x86_64 -kernel bzImage -hda rootfs.img -append "root=/dev/sda"
```
`-kernel`选项选择内核，`-hda`选择文件系统镜像，`-append  "root=/dev/sda"`表示将第一个硬盘（即/dev/sda）作为根文件系统。
运行效果如下：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230331213346.png)


## 使用vscode浏览linux源码
建议使用[clangd](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd)，它速度更快、提示信息更多。
我们需要在项目根目录生成一个`compile_commands.json`文件，通过这个文件可以确定源文件需要引用的头文件。如果是用cmake工程，添加`-DCMAKE_EXPORT_COMPILE_COMMANDS=ON`参数就能生成，但linux项目使用的是makefile，在这种情况下我们需要使用[bear](https://github.com/rizsotto/Bear)，这是一个专门为clang生成compile_commands的工具，在ubuntu下使用`sudo apt install bear`安装，然后在linux根目录下执行：
```shell
bear -- make -j$(nproc)
```


## 参考资料
使用vscode+qemu调试linux源码  https://howardlau.me/programming/debugging-linux-kernel-with-vscode-qemu.html