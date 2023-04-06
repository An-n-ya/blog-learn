---
title: Linux学习笔记（三）--- linux是如何进入保护模式、长模式的？
description: 研究切换CPU模式，并进行初始化的
---
上篇文章讲到`boot/main.c`的最后一个函数调用，我们首先来看看这个函数`go_to_protected_mode`的实现

## go_to_protected_mode()
这个函数和main.c很相似，是调用一系列函数完成进入保护模式的准备，具体包括：
- 打开a20
- 设置IDT
- 设置GDT
- 设置CR0寄存器的PE位
代码如下：
```c
void go_to_protected_mode(void)
{
	/* Hook before leaving real mode, also disables interrupts */
	realmode_switch_hook();

	/* Enable the A20 gate */
	if (enable_a20()) {
		puts("A20 gate not responding, unable to boot...\n");
		die();
	}

	/* Reset coprocessor (IGNNE#) */
	reset_coprocessor();

	/* Mask all interrupts in the PIC */
	mask_all_interrupts();

	/* Actual transition to protected mode... */
	setup_idt();
	setup_gdt();
	protected_mode_jump(boot_params.hdr.code32_start,
			    (u32)&boot_params + (ds() << 4));
}
```
我们一个个的去看每个函数的作用。

### realmode_switch_hook()
这个函数的作用正如函数名所表示的，它用来设置一个从实模式切换到保护模式的钩子函数，也就是说设置一个函数在发生模式切换的时候调用：
```c
static void realmode_switch_hook(void)
{
	if (boot_params.hdr.realmode_swtch) {
		asm volatile("lcallw *%0"
			     : : "m" (boot_params.hdr.realmode_swtch)
			     : "eax", "ebx", "ecx", "edx");
	} else {
		asm volatile("cli");
		outb(0x80, 0x70); /* Disable NMI */
		io_delay();
	}
}
```
这个钩子函数的地址定义在`boot_params.hdr.realmode_swtch`(这里好像有个typo：swtch->switch)。
如果没有这个钩子函数，就直接关闭NMI（NonMaskable Interrupt）。

### enable_a20()
A20是8086引入的一个内存访问信号线，由于8086最多访问20位的地址（即A0~A19），A20信号线后来就被作为开启保护模式的一个前提要求，在较新的CPU中A20是默认开启的，如果A20没有开启，我们可以以下几种方式开启：
- bios开启，使用15h中断，设置ax=0x2401
- 通过键盘控制器开启，早期CPU地址信号线最多到A19，A20通常由键盘控制器使用，因此可以通过键盘控制器开启A20
- Fast A20 Gate。 早期有个“A20 Gate”的电路，但是这个电路在切换A20的时候需要等待一段时间，后来就出现了“Fast A20 Gate”，这是一种由高速锁存器实现的电路，能更好的控制A20

enable_a20函数的代码如下：
```c
int enable_a20(void)
{
       int loops = A20_ENABLE_LOOPS;
       int kbc_err;

       while (loops--) {
	       /* First, check to see if A20 is already enabled
		  (legacy free, etc.) */
	       if (a20_test_short())
		       return 0;
	       
	       /* Next, try the BIOS (INT 0x15, AX=0x2401) */
	       enable_a20_bios();
	       if (a20_test_short())
		       return 0;
	       
	       /* Try enabling A20 through the keyboard controller */
	       kbc_err = empty_8042();

	       if (a20_test_short())
		       return 0; /* BIOS worked, but with delayed reaction */
	
	       if (!kbc_err) {
		       enable_a20_kbc();
		       if (a20_test_long())
			       return 0;
	       }
	       
	       /* Finally, try enabling the "fast A20 gate" */
	       enable_a20_fast();
	       if (a20_test_long())
		       return 0;
       }
       
       return -1;
}
```
由于现代CPU都是默认开启A20的，所以linux会首先检查A20是否开启，如果已经开启就不需要后续工作了。
后续的代码就是分别尝试三种不同的方式去开启A20，尝试顺序是：bios -> 键盘控制器 -> fast a20 gate。每种开启A20方法的具体细节就不多讲了。

如果上面的方法都不能开启a20，就返回-1，返回的-1会触发`go_to_protected_mode`中的终止操作。

### reset_coprocessor()
这个函数和enable_a20函数一样是“时代的眼泪”，曾经的CPU为了支持浮点数运算需要“协处理器”，而现代CPU已经继承了浮点单元，所以这个函数没啥用处。

### mask_all_interrupts()
这个函数只是执行了两个汇编代码：
```c
static void mask_all_interrupts(void)
{
	outb(0xff, 0xa1);	/* Mask all interrupts on the secondary PIC */
	io_delay();
	outb(0xfb, 0x21);	/* Mask all but cascade on the primary PIC */
	io_delay();
}
```
这两则汇编代码是控制中断控制器8259a的，`outb(0xff, 0xa1)`用来禁止主片IRQ8到IRQ15的中断，而`outb(0xfb, 0x21)`用来禁止从片到主片的级联中断。

之所以关闭中断，是为了在保护模式下重新配置8259a

### setup_idt()
```c
static void setup_idt(void)
{
	static const struct gdt_ptr null_idt = {0, 0};
	asm volatile("lidtl %0" : : "m" (null_idt));
}
```
这个函数用来设置中段描述符表。这儿用到的数据结构`gdt_ptr`定义如下：
```c
struct gdt_ptr {
    u16 len;
    u32 ptr;
} __attribute__((packed));
```
len表示idt的大小，ptr表示idt的地址。
这里把这两个属性都设置为了0，就表示设置IDT为空。

### setup_gdt()
```c
static void setup_gdt(void)
{
	/* There are machines which are known to not boot with the GDT
	   being 8-byte unaligned.  Intel recommends 16 byte alignment. */
	static const u64 boot_gdt[] __attribute__((aligned(16))) = {
		/* CS: code, read/execute, 4 GB, base 0 */
		[GDT_ENTRY_BOOT_CS] = GDT_ENTRY(0xc09b, 0, 0xfffff),
		/* DS: data, read/write, 4 GB, base 0 */
		[GDT_ENTRY_BOOT_DS] = GDT_ENTRY(0xc093, 0, 0xfffff),
		/* TSS: 32-bit tss, 104 bytes, base 4096 */
		/* We only have a TSS here to keep Intel VT happy;
		   we don't actually use it for anything. */
		[GDT_ENTRY_BOOT_TSS] = GDT_ENTRY(0x0089, 4096, 103),
	};
	/* Xen HVM incorrectly stores a pointer to the gdt_ptr, instead
	   of the gdt_ptr contents.  Thus, make it static so it will
	   stay in memory, at least long enough that we switch to the
	   proper kernel GDT. */
	static struct gdt_ptr gdt;

	gdt.len = sizeof(boot_gdt)-1;
	gdt.ptr = (u32)&boot_gdt + (ds() << 4);

	asm volatile("lgdtl %0" : : "m" (gdt));
}
```
这段代码首先定义了一个数组`boot_gdt`，并把它设置为16字节对齐的，这是intel推荐的。数组中定义了三个段描述符CS、DS和TSS，由于我们之前设置IDT为空，因此TSS其实是不起作用的，之所以要设置TSS是为了keep Intel VT happy。
这里用到了一个宏`GDT_ENTRY`，它接受三个参数：标志、基地址、段长度。
段描述符的40~47bits用于定义内存段的类型以及支持的操作，下表给出了段类型定义
```shell
|           Type Field        | Descriptor Type | Description
|-----------------------------|-----------------|------------------
| Decimal                     |                 |
|             0    E    W   A |                 |
| 0           0    0    0   0 | Data            | Read-Only
| 1           0    0    0   1 | Data            | Read-Only, accessed
| 2           0    0    1   0 | Data            | Read/Write
| 3           0    0    1   1 | Data            | Read/Write, accessed
| 4           0    1    0   0 | Data            | Read-Only, expand-down
| 5           0    1    0   1 | Data            | Read-Only, expand-down, accessed
| 6           0    1    1   0 | Data            | Read/Write, expand-down
| 7           0    1    1   1 | Data            | Read/Write, expand-down, accessed
|                  C    R   A |                 |
| 8           1    0    0   0 | Code            | Execute-Only
| 9           1    0    0   1 | Code            | Execute-Only, accessed
| 10          1    0    1   0 | Code            | Execute/Read
| 11          1    0    1   1 | Code            | Execute/Read, accessed
| 12          1    1    0   0 | Code            | Execute-Only, conforming
| 14          1    1    0   1 | Code            | Execute-Only, conforming, accessed
| 13          1    1    1   0 | Code            | Execute/Read, conforming
| 15          1    1    1   1 | Code            | Execute/Read, conforming, accessed
```
上述设置中代码段和数据段的基地址和长度都是一样的（都是平坦地址，linux不使用分段机制而是使用分页机制），描述符有所不同。以代码段的`0xc09b`为例，它写成二进制是`1100 0000 1001 1011`，含义如下:

-    1 - (G) 这里为 1，表示段的实际长度是 0xfffff * 4kb = 4GB
-    1 - (D) 表示这个段是一个32位段
-    0 - (L) 这个代码段没有运行在 long mode
-    0 - (AVL) Linux 没有使用
-    0000 - 段长度的4个位
-    1 - (P) 段已经位于内存中
-    00 - (DPL) - 段优先级为0
-    1 - (S) 说明这个段是一个代码或者数据段
-    101 - 段类型为可执行/可读
-    1 - 段可访问

这个数组定义好之后，把它的地址、长度信息赋值给`gdt_ptr`结构，然后使用`lgdtl`指令加载GDT。

### protected_mode_jump
这个函数是一个汇编函数，来自`boot/pmjump.S`
```asm
SYM_FUNC_START_NOALIGN(protected_mode_jump)
	movl	%edx, %esi		# Pointer to boot_params table

	xorl	%ebx, %ebx
	movw	%cs, %bx
	shll	$4, %ebx
	addl	%ebx, 2f
	jmp	1f			# Short jump to serialize on 386/486
1:

	movw	$__BOOT_DS, %cx
	movw	$__BOOT_TSS, %di

	movl	%cr0, %edx
	orb	$X86_CR0_PE, %dl	# Protected mode
	movl	%edx, %cr0

	# Transition to 32-bit mode
	.byte	0x66, 0xea		# ljmpl opcode
2:	.long	.Lin_pm32		# offset
	.word	__BOOT_CS		# segment
SYM_FUNC_END(protected_mode_jump)

	.code32
	.section ".text32","ax"
SYM_FUNC_START_LOCAL_NOALIGN(.Lin_pm32)
	# Set up data segments for flat 32-bit mode
	movl	%ecx, %ds
	movl	%ecx, %es
	movl	%ecx, %fs
	movl	%ecx, %gs
	movl	%ecx, %ss
	# The 32-bit code sets up its own stack, but this way we do have
	# a valid stack if some debugging hack wants to use it.
	addl	%ebx, %esp

	# Set up TR to make Intel VT happy
	ltr	%di

	# Clear registers to allow for future extensions to the
	# 32-bit boot protocol
	xorl	%ecx, %ecx
	xorl	%edx, %edx
	xorl	%ebx, %ebx
	xorl	%ebp, %ebp
	xorl	%edi, %edi

	# Set up LDTR to make Intel VT happy
	lldt	%cx

	jmpl	*%eax			# Jump to the 32-bit entrypoint
SYM_FUNC_END(.Lin_pm32)
```
下面的汇编代码设置了CR0寄存器的PE位，这是开启保护模式前必须做的：
```asm
	movl	%cr0, %edx
	orb	$X86_CR0_PE, %dl	# Protected mode
	movl	%edx, %cr0
```
然后就跳转到了32位的汇编代码（有.code32标识）.Lin_pm32，这个函数首先将所有的段寄存器指向数据段，然后将所有通用寄存器（除了eax）清零，最后跳转到`eax`寄存器指向的地址，根据linux内核引导协议，当我们在使用bzImage的时候保护模式的内核将被引导到`0x100000`。

至此操作系统就进入了保护模式，并开始执行位于`0x100000`的代码。




## 参考资料
linux-insides https://xinqiu.gitbooks.io/linux-insides-cn/content/Booting/linux-bootstrap-1.html