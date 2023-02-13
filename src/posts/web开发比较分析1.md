---
title: web开发比较分析（一） 
description: 比较不同语言下的web开发技术
---
一直觉得比较学习是很好的学习方法，比如在文学领域就有"比较文学"，比较文学往往需要探索在不同文化下不同语言下对某个主题（比如“杀父娶母”这样的俄狄浦斯情节）的表现，即是在不同的文化语言中找共性、做对比，这是一种很好的探索人类思想史的方法。
我们发现在计算机领域提供了可供比较的庞大环境，比如芯片设计上的RISC和CISC，这两种指令集似乎都可以工作得很好，那么这两种指令集之间有何共性？如何取长补短？就是很好的研究角度。再比如操作系统里的宏内核和微内核，这两种内核架构等产生了广泛应用的操作系统（宏内核的Linux，微内核的Mach）。再比如编程语言里的编译语言和解释语言，又或者是TTL与CMOS，二进制计算机与三进制计算机等等。
人们在解决问题的时候不是马上就能看到一条最优路径的，常见的情况是：有好多条路都可以走，人们只不过是偶然选择了某一条路而已。于是当我们用“比较”的方式去研究某一个功能的不同实现时，往往能看到解决一个问题好多视角，我们不一定要比较孰优孰劣，而是要从这个问题中发现人们在解决问题时候的思考方法、思考角度。我认为这种探索过程比熟悉某一种技术更可贵。

于是，我打算用“比较”的方法来探索下web应用在各个编程语言下的实现方式，探索各个编程语言社区对web应用这一蓬勃生机领域的思考方式。

本系列打算选用以下几种编程语言：
- Java
- Python
- Go
- Rust
- Ruby
- JavaScript

这些编程语言中有虽已年迈但仍然生机勃勃的Java（1995年），有当下正火爆的Python（1991年），还有正在冉冉升起的Rust（2010年）。这些语言中有静态语言、有动态语言、有虚拟机语言、也有无运行时环境的语言。各个语言风格不同，我们首先来探索下它们在实现最简单的echo web 服务的异同吧！

## Java
我们使用SpringBoot来实现web服务，除了在pom中把spring-boot-starter-parent作为父pom外，我们还需要添加一个spring-boot-starter-web的依赖，这个依赖会为我们处理好SpringMVC的环境。
```xml
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-web</artifactId>
		</dependency>
```
java中实现一个web服务需要一个web容器，这个容器实现了`Servlet API`。SpringBoot内置了名为tomcat的web容器，就不用另外启动服务器了。
### 实现接口功能
SpringBoot中可以很方便的使用Java的注解功能来定义一个Controller
```java
@Controller
@ResponseBody
public class EchoController {
    @RequestMapping("/echo")
    public String echo(@RequestParam("param") String param) {
        return param;
    }
}
```
### 运行方式
打包成jar包，用`java`命令运行该jar包。

## Go
在Go中启动一个web服务十分简单，只需要标准库即可，不需要使用任何依赖。Go的`net/http`中实现了http服务所需要的运行环境，而不需要额外依赖一个服务器了。 
### 实现接口功能
因为go自带了web服务的运行环境，只需要一个go文件即可：
```go
package main

import (
	"fmt"
	"net/http"
)

func echo_handler(writer http.ResponseWriter, request *http.Request) {
	fmt.Fprintf(writer, "%s", request.RequestURI)
}

func main() {
	http.HandleFunc("/echo", echo_handler)
	http.ListenAndServe(":8080", nil)
}
```
### 运行方式
`go build echo.go`就会生成一个可执行文件，运行这个可执行文件就可以启动服务了。