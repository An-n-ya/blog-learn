---
title: Linux学习笔记（二）--- linux是如何启动的？
description: 研究linux是如何被引导的，linux在进入内核之前做了哪些初始化工作？
---

## bootloader 加载内核
本节会研究计算机上电后是如何引导加载linux内核的。由于不同的CPU架构启动过程不同，所以在linux项目中关于启动的代码都是在各自的架构文件夹内的。

计算机在上电后，CPU执行的第一条指令会指向BIOS/UEFI入口（这条跳转指令是写死在CPU里的），BIOS/UEFI会初始化并检查硬件（也会提供基础的访问硬件的接口供之后的bootloader使用），准备就绪后BIOS/UEFI就会加载引导扇区（MBR分区）的第一个扇区（512字节），这个引导扇区的最后必须是`0x55aa`，这是个2字节的魔术字节（用来表示这个扇区确实是一个引导扇区），这个扇区存储的就是`bootloader`。

有许多bootloader可供选择，比如[GRUB 2](https://www.gnu.org/software/grub/)和[syslinux](https://wiki.syslinux.org/wiki/index.php?title=The_Syslinux_Project)等等：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230331222458.png)
这张图来自`Documentation/x86/boot.rst`的`type_of_loader`小节

事实上linux也实现了自己的bootloader。我们可以在`arch/x86/boot/haeder.S`中看到：
```asm
	.global bootsect_start
bootsect_start:
#ifdef CONFIG_EFI_STUB
	# "MZ", MS-DOS header
	.word	MZ_MAGIC
#endif

	# Normalize the start address
	ljmp	$BOOTSEG, $start2
```
遵循UEFI标准的硬件需要这样的魔术字节`.word	MZ_MAGIC`，之后的`ljmp $BOOTSEG, $start2`则是跳转到了bootloader的位置，其中`$BOOTSET`就是熟悉的`0x7c00`。

bootloader 有两个主要作用：

- bootloader会填充`Real-Mode Kernel Header`，它的结构如下：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230331222738.png)
linux就是通过这个数据结构获取bootloader得到的信息的。

- bootloader还会把内核引导入内存，内存使用情况如下所示：
```shell
         | Protected-mode kernel  |
100000   +------------------------+
         | I/O memory hole        |
0A0000   +------------------------+
         | Reserved for BIOS      | Leave as much as possible unused
         ~                        ~
         | Command line           | (Can also be below the X+10000 mark)
X+10000  +------------------------+
         | Stack/heap             | For use by the kernel real-mode code.
X+08000  +------------------------+
         | Kernel setup           | The kernel real-mode code.
         | Kernel boot sector     | The kernel legacy boot sector.
       X +------------------------+
         | Boot loader            | <- Boot sector entry point 0x7C00
001000   +------------------------+
         | Reserved for MBR/BIOS  |
000800   +------------------------+
         | Typically used by MBR  |
000600   +------------------------+
         | BIOS use only          |
000000   +------------------------+
```
这张图来自`Documentation/x86/boot.rst`


qemu直接支持linux的bootloader，这就是会为什么我们在上一篇文章中直接使用`qemu -kernel bzImage`能直接运行的原因。当然我们也可以使用`GRUB`引导内核。

## 引导后的工作：start_of_setup
不管是bootloader填写的hdr信息，还是linux自己填写的，最后都会运行到`start_of_setup`(在我这边是header.S的588行
)，start_of_setup会进行以下四个工作：
-    将所有段寄存器的值设置成一样的内容
-    设置堆栈
-    设置 bss （静态变量区）
-    跳转到 main.c 开始执行代码



## 参考资料
linux-insides https://xinqiu.gitbooks.io/linux-insides-cn/content/Booting/linux-bootstrap-1.html