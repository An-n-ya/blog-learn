```cpp
m_shared_framebuffer_vmobject = MUST(Memory::SharedFramebufferVMObject::try_create_for_physical_range(m_framebuffer_address.value(), rounded_size));
```



## Open the memory debug mode
```shell
cmake -B Build/x86_64 -DMEMROY_DEBUG=ON
ninja -C Build/x86_64 setup-and-run
```
The results are shown as below
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230423192450.png)


there are two physical regions
the highest address is 0x00000000100000000


`MemoryManager::parse_memory_map()` will parse the memory map obtained from multiboot and create pte and pde.
`activate_kernel_page_directory(kernel_page_directory());` will load pde into cr3.
`protect_kernel_image()` will ensure every address of the kernel has been mapped into pte and pde.


## APIC
APIC和ACPI不是一个东西
ACPI是一份BIOS启动标准，用来初始化机器。 https://uefi.org/specs/ACPI/6.5/01_Introduction.html
QEMU提供了ACPI的实现： https://www.qemu.org/docs/master/specs/acpi_hw_reduced_hotplug.html

在ACPI初始化的众多设备中，中断处理芯片APIC就是其中之一，APIC是取代8259的中断控制器，之所有需要APIC，是因为在多核处理器下，8259不能很好的管理中断了。APIC给出的解决方案是：控制器被分成了两部分，每个逻辑处理器都独有一个local APIC，而这些local APIC由IO APIC统一管理，IO APIC接收到中断信号后将它通过system bus分配给某个local APIC，每个local APIC都有一个唯一标识APIC ID。


## bit fields
We usually see the struct below in serenityOS:
```c
    struct {
        u8 gate_type : 4;
        u8 storage_segment : 1;
        u8 descriptor_privilege_level : 2;
        u8 present : 1;
    } type_attr;  // type and attributes
``` 
the number behind the colon is the [bit fields](https://learn.microsoft.com/en-us/cpp/c-language/c-bit-fields?view=msvc-170)
A structure declarator can be a specified number of bits, called a "bit field." Its length is set off from the declarator for the field name by a colon.

## __packed__ attribute
The memory layout in C's struct is auto aligned by the maximum size of its fields. For example:
```c
#include<stdio.h>
struct test
{
    char a;
    int  b;
    float c;
};
 
int main(void)
{
    printf("char=%d\n",sizeof(char));
    printf("int=%d\n",sizeof(int));
    printf("float=%d\n",sizeof(float));
    printf("struct test=%d\n",sizeof(struct test));
    return 0;
}
```
The result will be:
```shell
char=1
int=4
float=4
struct test=12
```
which means the struct test is aligned by 4. There are three fields in this struct, hence the size of the struct will be 12.

For more information about the attribute can be found in the [gcc doc](https://gcc.gnu.org/onlinedocs/gcc-3.3/gcc/Type-Attributes.html)

## What is fs/gs indented for?
FS and GS have no processor-defined purpose, but instead are given purpose by the OS's running them.
The linux kernel uses GS to access cpu-specific memory.


In serenityOS, GS is used for storing current cpu. In `Processor::gdt_init`, register gs is set to `this`:
```c
    MSR gs_base(MSR_GS_BASE);
    gs_base.set((u64)this);
```
which is implemented by `wrmsr` opcode. In 64-bit mode, cs, ds, es, ss is not allowed to use, but FS and GS can be used in 64-bit mode. Opcode `wrmsr` is needed to access these segment register:
>There are two methods to update the contents of the FS.base and GS.base hidden descriptor fields. The first is available exclusively to privileged software (CPL = 0). The FS.base and GS.base hidden descriptor-register fields are mapped to MSRs. Privileged software can load a 64-bit base address in canonical form into FS.base or GS.base using a single WRMSR instruction. The FS.base MSR address is C000_0100h while the GS.base MSR address is C000_0101h.
refer to [AMD Architecture Programmer's Manual Volume 2: System Programming](https://www.amd.com/en/support)


`gdt_init` is called by `early_initialize` which is called by `bsp` and `ap` respectively.

## when the interrupt occur, the usage of the stack
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230504204926.png)
refer to [intel manual volume 3](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)

In serenity, this structure is expressed in the format of `TrapFrame`, which is formed by `Processor::init_context()`


## interrupt init
In the procedure of system init, the function `initialize_interrupts` is called.
This function creates a lot of `IDTEntry`, and stores them into a array `s_idt`.
`IDTEntry` is defined in the way of IDT format:
```c
struct [[gnu::packed]] IDTEntry
{
    u16 offset_1; // offset bits 0..15
    u16 selector; // a code segment selector in GDT or LDT

    struct {
        u8 interrupt_stack_table : 3;
        u8 zero : 5; // unused, set to 0
    };

    struct {
        u8 gate_type : 4;
        u8 storage_segment : 1;
        u8 descriptor_privilege_level : 2;
        u8 present : 1;
    } type_attr;  // type and attributes
    u16 offset_2; // offset bits 16..31
    u32 offset_3;
    u32 zeros;
}
```
When the IDTEntry is fully created, serenity will load s_idt using the code below:
```c
    asm("lidt %0" ::"m"(s_idtr));
```

all the interrupt handle function is defined in a MACRO `EH_ENTRY`, which follows a fixed procedure:
```c
        asm(                                                                   \
            "    pushq %r15\n"                                                 \
            "    pushq %r14\n"                                                 \
            "    pushq %r13\n"                                                 \
            "    pushq %r12\n"                                                 \
            "    pushq %r11\n"                                                 \
            "    pushq %r10\n"                                                 \
            "    pushq %r9\n"                                                  \
            "    pushq %r8\n"                                                  \
            "    pushq %rax\n"                                                 \
            "    pushq %rcx\n"                                                 \
            "    pushq %rdx\n"                                                 \
            "    pushq %rbx\n"                                                 \
            "    pushq %rsp\n"                                                 \
            "    pushq %rbp\n"                                                 \
            "    pushq %rsi\n"                                                 \
            "    pushq %rdi\n"                                                 \
            "    pushq %rsp \n" /* set TrapFrame::regs */                      \
            "    subq $" __STRINGIFY(TRAP_FRAME_SIZE - 8) ", %rsp \n"          \
            "    subq $0x8, %rsp\n" /* align stack */                          \
            "    lea 0x8(%rsp), %rdi \n"                                       \
            "    cld\n"                                                        \
            "    call enter_trap_no_irq \n"                                    \
            "    lea 0x8(%rsp), %rdi \n"                                       \
            "    call " #title "_handler\n"                                    \
            "    addq $0x8, %rsp\n" /* undo alignment */                       \
            "    jmp common_trap_exit \n"                                      \
        );                                                                     \
```
before the real interrupt function is called, `enter_trap_no_irq` will be called. This function is responsible for dealing with process schedule thing.