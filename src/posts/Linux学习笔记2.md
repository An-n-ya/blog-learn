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
```
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
-    设置 bss （静态变量区都清零）
-    跳转到 main.c 开始执行代码
前三个都是为了运行c代码做准备，最后一个功能是通过：
```
calll main
```
实现的，这里的`calll`代表`call far`，现在都是使用平坦模式，因此这里的calll和call作用是一样的。

## boot/main.c的功能
main函数主要负责各种初始化，它的代码逻辑很直接，就是调用一系列函数：
```c
void main(void)
{
	init_default_io_ops();

	/* First, copy the boot header into the "zeropage" */
	copy_boot_params();

	/* Initialize the early-boot console */
	console_init();
	if (cmdline_find_option_bool("debug"))
		puts("early console in setup code\n");

	/* End of heap check */
	init_heap();

	/* Make sure we have all the proper CPU support */
	if (validate_cpu()) {
		puts("Unable to boot - please use a kernel appropriate "
		     "for your CPU.\n");
		die();
	}

	/* Tell the BIOS what CPU mode we intend to run in. */
	set_bios_mode();

	/* Detect memory layout */
	detect_memory();

	/* Set keyboard repeat rate (why?) and query the lock flags */
	keyboard_init();

	/* Query Intel SpeedStep (IST) information */
	query_ist();

	/* Query APM information */
#if defined(CONFIG_APM) || defined(CONFIG_APM_MODULE)
	query_apm_bios();
#endif

	/* Query EDD information */
#if defined(CONFIG_EDD) || defined(CONFIG_EDD_MODULE)
	query_edd();
#endif

	/* Set the video mode */
	set_video();

	/* Do the last things and invoke protected mode */
	go_to_protected_mode();
}
```
我们逐个看看每个函数的作用。

### init_default_io_ops()
这个函数用来构造io汇编指令，它的内容如下：
```c
static inline void init_default_io_ops(void)
{
	pio_ops.f_inb  = __inb;
	pio_ops.f_outb = __outb;
	pio_ops.f_outw = __outw;
}
```
其中`pio_ops`的结构体定义如下：
```c
struct port_io_ops {
	u8	(*f_inb)(u16 port);
	void	(*f_outb)(u8 v, u16 port);
	void	(*f_outw)(u16 v, u16 port);
};
```
它的三个成员都是函数，对应的参数类型和返回值类型在结构体中定义了。
那么`__inb`，`__outb`，`__outw`在哪定义的呢？它们的定义来自于一个宏：
```c
#define BUILDIO(bwl, bw, type)						    \
static inline void __out##bwl(type value, u16 port)		\
{									                    \
	asm volatile("out" #bwl " %" #bw "0, %w1"			\
		     : : "a"(value), "Nd"(port));			    \
}									                    \
									                    \
static inline type __in##bwl(u16 port)					\
{									                    \
	type value;							                \
	asm volatile("in" #bwl " %w1, %" #bw "0"			\
		     : "=a"(value) : "Nd"(port));			    \
	return value;							            \
}

BUILDIO(b, b, u8)
BUILDIO(w, w, u16)
BUILDIO(l,  , u32)
```
根据这个宏的定义，`BUILDIO(b,b,u8)`会产生下面的代码：
```c
static inline void __outb(u8 value, u16 port)
{
    asm volatile("outb %b0 %w1" : : "a"(value), "Nd"(port));
}
static inline u8 __inb(u16 port)
{
    u8 value;
    asm volatile("inb %w1 %b0" : : "=a"(value), "Nd"(port));
    return value;
}
```
这样就自动生成了两个关于`outb inb`汇编指令的嵌入代码。

### copy_boot_params()
这个函数的主要逻辑就一行：
```c
	memcpy(&boot_params.hdr, &hdr, sizeof(hdr));
```
即把`header.S`中的hdr结构复制到`&boot_params.hdr`中，hdr的结构我们之前提到过，这里主要看下boot_params的结构：
```c
/* The so-called "zeropage" */
struct boot_params {
	struct screen_info screen_info;			/* 0x000 */
	struct apm_bios_info apm_bios_info;		/* 0x040 */
	__u8  _pad2[4];					/* 0x054 */
	__u64  tboot_addr;				/* 0x058 */
	struct ist_info ist_info;			/* 0x060 */
	__u64 acpi_rsdp_addr;				/* 0x070 */
	__u8  _pad3[8];					/* 0x078 */
	__u8  hd0_info[16];	/* obsolete! */		/* 0x080 */
	__u8  hd1_info[16];	/* obsolete! */		/* 0x090 */
	struct sys_desc_table sys_desc_table; /* obsolete! */	/* 0x0a0 */
	struct olpc_ofw_header olpc_ofw_header;		/* 0x0b0 */
	__u32 ext_ramdisk_image;			/* 0x0c0 */
	__u32 ext_ramdisk_size;				/* 0x0c4 */
	__u32 ext_cmd_line_ptr;				/* 0x0c8 */
	__u8  _pad4[112];				/* 0x0cc */
	__u32 cc_blob_address;				/* 0x13c */
	struct edid_info edid_info;			/* 0x140 */
	struct efi_info efi_info;			/* 0x1c0 */
	__u32 alt_mem_k;				/* 0x1e0 */
	__u32 scratch;		/* Scratch field! */	/* 0x1e4 */
	__u8  e820_entries;				/* 0x1e8 */
	__u8  eddbuf_entries;				/* 0x1e9 */
	__u8  edd_mbr_sig_buf_entries;			/* 0x1ea */
	__u8  kbd_status;				/* 0x1eb */
	__u8  secure_boot;				/* 0x1ec */
	__u8  _pad5[2];					/* 0x1ed */
	/*
	 * The sentinel is set to a nonzero value (0xff) in header.S.
	 *
	 * A bootloader is supposed to only take setup_header and put
	 * it into a clean boot_params buffer. If it turns out that
	 * it is clumsy or too generous with the buffer, it most
	 * probably will pick up the sentinel variable too. The fact
	 * that this variable then is still 0xff will let kernel
	 * know that some variables in boot_params are invalid and
	 * kernel should zero out certain portions of boot_params.
	 */
	__u8  sentinel;					/* 0x1ef */
	__u8  _pad6[1];					/* 0x1f0 */
	struct setup_header hdr;    /* setup header */	/* 0x1f1 */
	__u8  _pad7[0x290-0x1f1-sizeof(struct setup_header)];
	__u32 edd_mbr_sig_buffer[EDD_MBR_SIG_MAX];	/* 0x290 */
	struct boot_e820_entry e820_table[E820_MAX_ENTRIES_ZEROPAGE]; /* 0x2d0 */
	__u8  _pad8[48];				/* 0xcd0 */
	struct edd_info eddbuf[EDDMAXNR];		/* 0xd00 */
	__u8  _pad9[276];				/* 0xeec */
} __attribute__((packed));
```
这个结构也被称作“zeropage”。

函数`memcpy`是汇编实现的，它的实现在`arch/x86/boot/copy.S`中：
```
SYM_FUNC_START_NOALIGN(memcpy)
	pushw	%si
	pushw	%di
	movw	%ax, %di
	movw	%dx, %si
	pushw	%cx
	shrw	$2, %cx
	rep; movsl
	popw	%cx
	andw	$3, %cx
	rep; movsb
	popw	%di
	popw	%si
	retl
SYM_FUNC_END(memcpy)
```
这个方法的前两行用于保存寄存器，`ax`，`dx`，`cx`是函数调用参数传递过来的，重点在于`rep movsl`这一行，这一行的作用是把cx个双字从si移动到di。如果要复制的字节数不是4的整倍数，就需要取出低两位（and w $3, %cx）逐字节复制。
最后把si di复原就好了。

### console_init()
这个函数用来初始化串口通信。PC的COM1端口默认地址是`0x3f8`，console_init()会对这个地址进行初始化操作。
顺带一体，串口通信在嵌入式中很常见，它通常使用RS-232 或者 RS-485 等标准协议，在数据传输过程中，需要进行起始位、数据位、校验位、停止位等的添加和解析，以保证数据传输的正确性。
回到tyyS0的初始化：
```c
static void early_serial_init(int port, int baud)
{
	unsigned char c;
	unsigned divisor;

	outb(0x3, port + LCR);	/* 8n1 */
	outb(0, port + IER);	/* no interrupt */
	outb(0, port + FCR);	/* no fifo */
	outb(0x3, port + MCR);	/* DTR + RTS */

	divisor	= 115200 / baud;
	c = inb(port + LCR);
	outb(c | DLAB, port + LCR);
	outb(divisor & 0xff, port + DLL);
	outb((divisor >> 8) & 0xff, port + DLH);
	outb(c & ~DLAB, port + LCR);

	early_serial_base = port;
}
```
这些代码的作用是用于初始化串口控制器的寄存器，设置波特率、数据位、停止位、校验位等参数，以便能够正确地进行串口通信。

具体地，这段代码会执行以下操作：
- 将控制寄存器的 LCR（Line Control Register）字段设置为 0x03，表示使用 8 位数据、无校验、1 位停止位的数据格式。
- 将中断使能寄存器的 IER（Interrupt Enable Register）字段设置为 0，表示不启用中断。
-    将 FIFO 控制寄存器的 FCR（FIFO Control Register）字段设置为 0，表示禁用 FIFO 缓冲。
-    将 modem 控制寄存器的 MCR（Modem Control Register）字段设置为 0x03，表示打开数据终端就绪（DTR）和请求发送（RTS）的控制信号。
-    计算波特率对应的分频器值，并将控制寄存器的 LCR 字段设置为 DLAB（Divisor Latch Access Bit）模式，以便能够访问分频器寄存器。
-    将分频器值的低 8 位写入分频器寄存器的 DLL（Divisor Latch Low Byte）字段，将分频器值的高 8 位写入分频器寄存器的 DLH（Divisor Latch High Byte）字段。
-    将控制寄存器的 LCR 字段恢复为原来的值，以便能够访问其他寄存器。
-    最后，将串口控制器的基地址赋值给全局变量 early_serial_base，以便其他函数能够使用这个地址访问串口控制器寄存器。

串口初始化成功后就会回到main函数，执行：
```c
	if (cmdline_find_option_bool("debug"))
		puts("early console in setup code\n");
```
这里的`puts`函数来自`tty.c`，每个字符的输出是由`bios_putchar`实现的：
```c
static void __section(".inittext") bios_putchar(int ch)
{
	struct biosregs ireg;

	initregs(&ireg);
	ireg.bx = 0x0007;
	ireg.cx = 0x0001;
	ireg.ah = 0x0e;
	ireg.al = ch;
	intcall(0x10, &ireg, NULL);
}
```
正如这个函数名所暗示的，这个输出字符的功能来自bios的`0x10`号中断。在`putchar`中会检查串口是否初始化成功，如果成功就往串口输送同样的数据：
```c
void __section(".inittext") putchar(int ch)
{
	if (ch == '\n')
		putchar('\r');	/* \n -> \r\n */

	bios_putchar(ch);

	if (early_serial_base != 0)
		serial_putchar(ch);
}
```

### init_heap()
代码如下：
```c
static void init_heap(void)
{
	char *stack_end;

	if (boot_params.hdr.loadflags & CAN_USE_HEAP) {
		asm("leal %P1(%%esp),%0"
		    : "=r" (stack_end) : "i" (-STACK_SIZE));

		heap_end = (char *)
			((size_t)boot_params.hdr.heap_end_ptr + 0x200);
		if (heap_end > stack_end)
			heap_end = stack_end;
	} else {
		/* Boot protocol 2.00 only, no heap available */
		puts("WARNING: Ancient bootloader, some functionality "
		     "may be limited!\n");
	}
}
```
上面的汇编代码相当于`leal (-STACK_SIZE)(%%ESP), (stack_end)`，即`stack_end = esp - STACK_SIZE`，STACK_SIZE默认值是1024。stack和heap的增长方向相反，所以如果heap的范围超过了stack的范围，需要让heap_end等于stack_end。

### validate_cpu()
这个函数检测cpu的类型，可以通过`cpuid`汇编指令查看cpu信息，如果不符合，就直接停止报错。
逻辑比较直接，就不贴代码啦。

### set_bios_mode()
这个函数使用bios的`0x15`中断告诉bios系统会运行在long mode。
```c
static void set_bios_mode(void)
{
#ifdef CONFIG_X86_64
	struct biosregs ireg;

	initregs(&ireg);
	ireg.ax = 0xec00;
	ireg.bx = 2;
	intcall(0x15, &ireg, NULL);
#endif
}
```
这里的ax设置为`0xec00` bx设置为`2`就是选择0x15号中断的具体功能，0x15号中断有很多功能，这是其中一个，我们会在下一个函数看到这个中断的其他功能。
[参考](https://forum.osdev.org/viewtopic.php?p=161565&sid=fef9739a304d873c5e231a41a0c86b46)

### detect_memory()
这个函数使用0x15号中断的三个功能探测内存的可用情况：
```c
void detect_memory(void)
{
	detect_memory_e820();

	detect_memory_e801();

	detect_memory_88();
}
```
e820返回一个20字节的数据，前8字节是地址，中间8字节是大小，最后4字节是类型，这对应了boot_e820_entry结构：
```c
struct boot_e820_entry {
	__u64 addr;
	__u64 size;
	__u32 type;
} __attribute__((packed));
```
在开机的时候linux会输出e820信息，可以从`dmesg`中得到（这个指令把历史的系统信息放在一个环形缓冲区）：
```shell
[  0.000000] KERNEL supported cpus:
[  0.000000]  Intel GenuineIntel
[  0.000000]  AMD AuthenticAMD
[  0.000000]  NSC Geode by NSC
[  0.000000]  Cyrix CyrixInstead
[  0.000000]  Centaur CentaurHauls
[  0.000000]  Transmeta GenuineTMx86
[  0.000000]  Transmeta TransmetaCPU
[  0.000000]  UMC UMC UMC UMC
[  0.000000] BIOS-provided physical RAM map:
[  0.000000] BIOS-e820: 0000000000000000 - 000000000009f800 (usable)
[  0.000000] BIOS-e820: 000000000009f800 - 00000000000a0000 (reserved)
[  0.000000] BIOS-e820: 00000000000ca000 - 00000000000cc000 (reserved)
[  0.000000] BIOS-e820: 00000000000dc000 - 00000000000e0000 (reserved)
[  0.000000] BIOS-e820: 00000000000e4000 - 0000000000100000 (reserved)
[  0.000000] BIOS-e820: 0000000000100000 - 000000003fef0000 (usable)
[  0.000000] BIOS-e820: 000000003fef0000 - 000000003feff000 (ACPI data)
[  0.000000] BIOS-e820: 000000003feff000 - 000000003ff00000 (ACPI NVS)
```
其他两个是相似，详细信息参考[这里](https://zhuanlan.zhihu.com/p/435020338)

### keyboard_init()
这个函数通过bios设置键盘
```c
static void keyboard_init(void)
{
	struct biosregs ireg, oreg;
	initregs(&ireg);

	ireg.ah = 0x02;		/* Get keyboard status */
	intcall(0x16, &ireg, &oreg);
	boot_params.kbd_status = oreg.al;

	ireg.ax = 0x0305;	/* Set keyboard repeat rate */
	intcall(0x16, &ireg, NULL);
}
```
通过16h号中断，获取键盘状态、并设置键盘的检测频率。

### query_edd()
这个函数从bios查询`Enhanced Disk Drive`信息：
```c
	for (devno = 0x80; devno < 0x80+EDD_MBR_SIG_MAX; devno++) {
		/*
		 * Scan the BIOS-supported hard disks and query EDD
		 * information...
		 */
		if (!get_edd_info(devno, &ei)
		    && boot_params.eddbuf_entries < EDDMAXNR) {
			memcpy(edp, &ei, sizeof(ei));
			edp++;
			boot_params.eddbuf_entries++;
		}

		if (do_mbr && !read_mbr_sig(devno, &ei, mbrptr++))
			boot_params.edd_mbr_sig_buf_entries = devno-0x80+1;
	}
```
它会从`0x80`开始扫描所有bios支持的硬盘，并获取edd信息，并读取mbr信息。

### set_video()
显示这一块比较复杂，暂时先pass
参考 https://xinqiu.gitbooks.io/linux-insides-cn/content/Booting/linux-bootstrap-3.html


至此，main.c的初始化工作都完成了，最后一个工作是进入到“保护模式”，保护模式的内容放到下一篇文章。

## 参考资料
linux-insides https://xinqiu.gitbooks.io/linux-insides-cn/content/Booting/linux-bootstrap-1.html