---
title: SpringBoot学习日记
description: 记录学习SpringBoot的过程
---

## 使用Jersey建立Restful服务
### 什么是Jersey？
Jersey是一个实现了JAX-RS(**Jakarta RESTful Web Services**)标准的框架，即帮助开发者开发RESTful的api的工具，它提供了许多注解来定义接口。JAX-RS是在[JSR-339](https://jcp.org/en/jsr/detail?id=339)下定义的

但Jersey和Spring MVC有什么区别呢？在我看来，两者的主要区别仅仅在于Jersey是符合标准的实现，而Spring MVC的实现是非标准的。不过Spring MVC的使用人数已经那么多了，是不是符合标准也没那么重要了。不过我本着好奇的心里去试了试Jersey，发现JAX-RS的注解确实更清晰一些。

两者的注解对比：
<table>
  <thead>
    <tr>
      <th>Spring Annotation</th>
      <th>JAX-RS Annotation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>@RequestMapping(path = “/troopers”)</td>
      <td>@Path(“/troopers”)</td>
    </tr>
    <tr>
      <td>@PostMapping</td>
      <td>@POST</td>
    </tr>
    <tr>
      <td>@PutMapping</td>
      <td>@PUT</td>
    </tr>
    <tr>
      <td>@GetMapping</td>
      <td>@GET</td>
    </tr>
    <tr>
      <td>@DeleteMapping</td>
      <td>@DELETE</td>
    </tr>
    <tr>
      <td>@ResponseBody</td>
      <td>N/A</td>
    </tr>
    <tr>
      <td>@RequestBody</td>
      <td>N/A</td>
    </tr>
    <tr>
      <td>@PathVariable(“id”)</td>
      <td>@PathParam(“id”)</td>
    </tr>
    <tr>
      <td>@RequestParam(“xyz”)</td>
      <td>@QueryParam(‘xyz”)</td>
    </tr>
    <tr>
      <td>@RequestParam(value=”xyz”)</td>
      <td>@FormParam(“xyz”)</td>
    </tr>
    <tr>
      <td>@RequestMapping(produces = {“application/json”})</td>
      <td>@Produces(“application/json”)</td>
    </tr>
    <tr>
      <td>@RequestMapping(consumes = {“application/json”})</td>
      <td>@Consumes(“application/json”)</td>
    </tr>
  </tbody>
</table>

### 在Spring Boot下使用Jersey
其实Jersey和Spring可以结合着使用，在spring boot项目中加入 `spring-boot-starter-jersey` 依赖就可以直接使用jersey啦。

#### 创建项目
在[spring initializr](https://start.spring.io/)下创建一个spring boot项目。在项目中添加`spring-boot-starter-jersey`依赖，并创建 config 文件夹和 endpoint 文件夹，目录结构如下
src
├── main
│   ├── java
│   │   └── host
│   │       └── ankh
│   │           └── jeyseylearn
│   │               ├── Application.java
│   │               ├── config
│   │               │   └── JerseyConfig.java
│   │               └── endpoint
│   │                   ├── HelloEndpoint.java
│   │                   └── ReverseReturnEndpoint.java
│   └── resources
│       └── application.properties
└── test
    └── java
        └── host
            └── ankh
                └── jeyseylearn
                    └── JerseyLearnApplicationTests.java

编辑JerseyConfig.java文件：
```java
@Configuration  
public class JerseyConfig extends ResourceConfig {  
    public JerseyConfig() {  
        register(HelloEndpoint.class);  
        register(ReverseReturnEndpoint.class);  
    }  
}
```
这里的`ResourceConfig`是jersey包下的，`@Configuration`则是spring的。

编写Endpoint文件：
```java
// src/main/java/host/ankh/jerseylearn/endpoint/HelloEndpoint.java
import jakarta.ws.rs.GET;  
import jakarta.ws.rs.Path;  
import jakarta.ws.rs.Produces;  
import org.springframework.stereotype.Service;

@Service  
@Path("/hello")  
public class HelloEndpoint {  
    @GET  
    @Produces("text/plain")  
    public String hello() {  
        return "hello from spring";  
    }  
}
```
这里用到的`GET, Path, Produces`都是属于标准的JAX-RS注解了（原来是在javax包下的，现在改为jakarta了），这个endpoint只是单纯返回一个String，有点太简单了，下面来个复杂点的。
```java
// src/main/java/host/ankh/jerseylearn/endpoint/ReverseReturnEndpoint.java
import jakarta.validation.constraints.NotNull;  
import jakarta.ws.rs.GET;  
import jakarta.ws.rs.Path;  
import jakarta.ws.rs.Produces;  
import jakarta.ws.rs.QueryParam;  
import org.springframework.stereotype.Service;  
  
@Service  
@Path("/reverse")  
public class ReverseReturnEndpoint {  
  
    @GET  
    @Produces("text/plain")  
    public String reverse(@QueryParam("data") @NotNull String data) {  
        return new StringBuilder(data).reverse().toString();  
    }  
  
}
```
这里用了`@QueryParam` 从`Params`中获取参数，并使用`@NotNull`注解表示这个参数是必须的，否则该接口会报错。

下面设置下springboot的参数：
```properties
server.port=8086  
server.servlet.context-path=/api  
spring.main.banner-mode=off  
  
logging.level.org.springframework=ERROR
```
springboot启动的时候太花里胡哨了，让人分不清有效信息，这里把多余的信息都去掉了。

#### 启动并测试项目
在项目根目录下运行`mvn spring-boot:run`启动项目，然后访问接口：
```shell
$ curl 'http://localhost:8086/api/hello'
hello
$ curl 'http://localhost:8086/api/reverse?data=hello'
olleh
```
结果符合预期。使用curl命令测试太麻烦了，我们去写一个测试类：
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)  
class JerseyLearnApplicationTests {  
   @Inject  
   private TestRestTemplate restTemplate;  
  
   @Test  
   void hello() {  
      ResponseEntity<String> entity = this.restTemplate.getForEntity("/hello", String.class);  
      assert(entity.getStatusCode().is2xxSuccessful());  
      assert(entity.getBody().equals("hello from spring"));  
   }  
  
   @Test  
   void reverse() {  
      ResponseEntity<String> entity = this.restTemplate.getForEntity("/reverse?data=hello", String.class);  
      assert entity.getStatusCode().is2xxSuccessful();  
      assert entity.getBody().equals("olleh");  
   }  
  
   @Test  
   void validation() {  
      ResponseEntity<String> entity = this.restTemplate.getForEntity("/reverse", String.class);  
      assert entity.getStatusCode().is4xxClientError();  
   }  
}
```
然后运行`mvn test`，结果如下：
```shell
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.161 s - in host.ankh.jeyseylearn.JerseyLearnApplicationTests
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  2.671 s
[INFO] Finished at: 2023-01-10T14:55:52+08:00
[INFO] ------------------------------------------------------------------------
```
测试成功!

#### 参考资料：
https://www.vogella.com/tutorials/REST/article.html
https://zetcode.com/springboot/jersey/

#### 下一步
使用jersey编写 [Hypermedia-Driven](https://en.wikipedia.org/wiki/HATEOAS) 的restful接口
解析更复杂的参数和返回更复杂内容
自定义返回错误信息

## SpringSecurity
我们使用[[SpringBoot#使用Jersey建立Restful服务]]的代码作为基础来创建一个有权限控制的SpringBoot应用。

#### SpringSecurity初探
添加security的依赖
```xml
<dependency>  
   <groupId>org.springframework.boot</groupId>  
   <artifactId>spring-boot-starter-security</artifactId>  
</dependency>
```
添加完`mvn compile` 一下。这时候再执行`mvn test`就会失败了，因为这个时候所有的接口需要权限才能访问。

我们接下来配置一下`Spring Security`，在`config`目录下添加`SecurityConfig.java`文件：
```java
@Configuration  
@EnableWebSecurity  
public class SecurityConfig {  
    // 创建SecurityFilterChain的工厂函数  
    @Bean  
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {  
        http.  
                authorizeHttpRequests((request) -> request  
                        .requestMatchers("/hello").permitAll()  
                        .requestMatchers("/reverse").permitAll()  
                        .anyRequest().authenticated())  
                .formLogin(form -> form.loginPage("/login").permitAll())  
                .logout(logout -> logout.permitAll());  
        return http.build();  
    }  
}
```
这里用的是`SpringSecurity6`的语法，6的语法和5的语法有点不一样，需要注意。`@Configuration`告诉了Spring这是一个配置类，`@EnableWebSecurity`是为了和Spring Web结合使用的（当然JAX-RS也是支持的）。
这个配置类暴露了一个Bean，这个Bean的类型是SecurityFilterChain，

这里先说一下SpringSecurity6的架构，在Client的request传入servlet之前，会经过一系列的filter
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230110155746.png)

每个Servlet可以让request通过传给下一个filter或Servlet，也可以直接把request请求打回。

现在我们点开`SecurityFilterChain`的定义，会发现这只是一个接口，它有两个方法`matches`和`getFilters`，matches就是用来判断某个request是否满足了filters设置的条件，getFilters则是获取该实例下的所有filter。
```java
public interface SecurityFilterChain {  
    boolean matches(HttpServletRequest request);  
  
    List<Filter> getFilters();  
}
```
那么我们的SecurityFilterChain是在哪里被调用的呢？其实上面的结构图做了一定的简化，详细一点的架构图长这样：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230110160146.png)

可以发现，每个SecurityFilterChain都是经过了一层层的委派和代理，这样`DelegatingFilterProxy`可以按需要选择并加载相应的`SecurityFilterChain`，这样做可以增加系统的灵活性，另一方面也让关键的filter操作掌握在spring框架手中，而不是直接暴露给用户，增加了系统的安全性。

了解完了原理，我们再回头看下我们的配置类，配置类暴露了一个SecurityFilterChain，我们在这个工厂函数内部定义了filter的行为
```java
                authorizeHttpRequests((request) -> request  
                        .requestMatchers("/hello").permitAll()  
                        .requestMatchers("/reverse").permitAll()  
                        .anyRequest().authenticated())  
```
上面的代码是说，如果request的链接包含了`/hello`或 `/reverse`就放行，如果是其他的路径，就需要检查权限。
而下面的代码是添加了login和logout功能，如果当前用户没有权限，则会跳转到`/login`，但login这个时候还没有定义
```java
                .formLogin(form -> form.loginPage("/login").permitAll())  
                .logout(logout -> logout.permitAll());  
```

这时候我们再运行`mvn test`，就可以发现测试通过了。

#### 增加需要权限的页面
为了测试login页面，我们需要几个静态页面。先添加`spring-boot-starter-web`依赖(不然会打不开静态页面的哦)，这样我们就可以访问resources里的资源了。
在`resources/static`下增加两个页面`index.html`和`home.html`
home页面设置为需要登录
```html
// resources/static/home.html
<!DOCTYPE html>  
<html lang="en">  
<head>  
    <meta charset="UTF-8">  
    <title>Home</title>  
</head>  
<body>  
<h1>This is Home!</h1>  
<a href="/logout"></a>  
</body>  
</html>
```
index页面设置为不需要登录
```html
<!DOCTYPE html>  
// resources/static/index.html
<html lang="en">  
<head>  
    <meta charset="UTF-8">  
    <title>hello</title>  
</head>  
<body>  
    <h1>hello world!</h1>  
    <p>this is the index page</p>  
</body>  
</html>
```

然后修改`SecurityConfig.java`文件
```java
@Configuration  
@EnableWebSecurity  
public class SecurityConfig {  
    // 创建SecurityFilterChain的工厂函数  
    @Bean  
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {  
        http.  
                authorizeHttpRequests((request) -> request  
                        .requestMatchers("/", "/index.html").permitAll()  
                        .anyRequest().authenticated())  
                .formLogin(Customizer.withDefaults())  
                .logout(Customizer.withDefaults())  
        return http.build();  
    }  
  
    @Bean  
    public UserDetailsService userDetailsService() {  
        UserDetails user =  
                User.withDefaultPasswordEncoder()  
                        .username("user")  
                        .password("user")  
                        .roles("USER")  
                        .build();  
  
        return new InMemoryUserDetailsManager(user);  
    }  
}
```
我们添加一个用户user（密码也是user），然后让`/`和`/index.html`路径不需要登录就可以访问，其他的页面都需要登录。

接下来进行手动测试，当我们直接打开`http://localhost:8086`的时候，可以看到index的内容：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230110183316.png)
但是当我们想访问`http://localhost:8086/home`的时候，就会自动跳转到登录页面了:
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230110183413.png)
这个登录页面是Spring Security自带的。 

#### 编写测试类
Jersey毕竟不是Spring的亲儿子，在SpringBoot下用Jersey创建Spring Security的测试类会比较困难。
如果是使用SpringMVC，我们可以使用`org.springframework.test.web.servlet.MockMvc`以及`org.springframework.security.test.context.support.WithMockUser`方便的进行权限相关的测试。

我们考虑自己建立一个用来测试权限的帮助类，使用这个帮助类来发起请求

首先需要关闭`csrf`，这样才能直接访问`/login`接口。
```diff
        http.  
                authorizeHttpRequests((request) -> request  
                        .requestMatchers("/", "/index.html").permitAll()  
                        .anyRequest().authenticated())  
                .formLogin(Customizer.withDefaults())  
                .logout(Customizer.withDefaults())  
+               .csrf().disable() 
        return http.build();  
```

然后我们来编写测试类，我们把这个测试类命名为`JAXRSResourceBase`，即为JAX-RS使用的resource请求的基类。
该类有以下一些注意事项：
- 在测试的时候是随机使用port的，所以这时候需要注入port，来获得端口
- Spring-Security默认使用cookie在确认用户身份，当我们测试需要登录的功能的时候，需要一个包装器，该包装器会自动获得cookie，然后再调用函数，这个包装器为`authenticatedScope`
- JAX-RS读取相应内容需要用`Response.readEntity(String.class)`方法

```java
@SpringBootTest(classes = Application.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class JAXRSResourceBase {
    @Value("${local.server.port}")
    int port;

    Logger log = LoggerFactory.getLogger(JAXRSResourceBase.class);

    private Map<String, NewCookie> cookies;

    Invocation.Builder build(String path) {
        Invocation.Builder builder = ClientBuilder.newClient()
                .target("http://localhost:" + port + "/api" + path)
                .property(ClientProperties.FOLLOW_REDIRECTS, false)
                .request(MediaType.MULTIPART_FORM_DATA).accept(MediaType.TEXT_PLAIN);
        if (cookies != null) {
            // 如果cookies不为空，说明已经登录，把cookies都传进去
            for (var cookie:cookies.entrySet()) {
                builder.cookie(cookie.getValue());
            }
        }
        return builder;
    }

    void login() {
        Form form = new Form();
        form.param("username", "user");
        form.param("password", "user");
        Invocation.Builder builder = ClientBuilder.newClient()
                .target("http://localhost:" + port + "/login")
                .property(ClientProperties.FOLLOW_REDIRECTS, false)
                .request(MediaType.MULTIPART_FORM_DATA).accept(MediaType.TEXT_PLAIN);
        var res = builder.post(Entity.form(form));
        this.cookies = res.getCookies();
    }

    void logout() {
        // 登出时，把cookies都清掉
        this.cookies = null;
    }

    void authenticatedScope(Runnable runner) {
        try {
            login();
            runner.run();
        } finally {
            logout();
        }
    }

    Response get(String path) {
        var res = build(path).get();
        return res;
    }

    Response post(String path, Object entity) {
        return build(path).post(Entity.form((Form) entity));
    }


    static void assertBadRequest(Response response) {
        assert Response.Status.BAD_REQUEST.getStatusCode() == response.getStatus();
    }
    static void assertForbidden(Response response) {
        assert Response.Status.FORBIDDEN.getStatusCode() == response.getStatus();
    }
    static void assertRedirect(Response response) {
        assert Response.Status.FOUND.getStatusCode() == response.getStatus();
    }
    static void assertOK(Response response) {
        assert Response.Status.OK.getStatusCode() == response.getStatus();
    }
}

```


然后我们改写一下测试类：
```java
// 继承JAXRSResourceBase，获得请求接口的一系列能力
class JerseyLearnApplicationTests extends JAXRSResourceBase {  
   @Test  
   void helloWhenUnauthenticated() throws Exception {  
      var res = get("/hello");  
      assertRedirect(res);  
   }  
  
   @Test  
   void helloWhenAuthenticated() throws Exception {  
      authenticatedScope(() -> {  
         var res = get("/hello");  
         assertOK(res);  
         var body = res.readEntity(String.class);  
         log.debug(new Supplier<String>() {  
            @Override  
            public String get() {  
               return "\u001B[34m" + body + "\u001B[0m\n" ;  
            }  
         });  
         assert body.equals("hello from spring");  
      });  
   }  
  
   @Test  
   void reverseWithParamsWhenAuth() throws Exception {  
      authenticatedScope(() -> {  
         var res = get("/reverse?data=hello");  
         assertOK(res);  
         assert res.readEntity(String.class).equals("olleh");  
      });  
   }  
}
```

然后执行`mvn test`, 测试成功！
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230110202755.png)


#### 参考资料
spring-security 官方示例代码 https://github.com/spring-projects/spring-security-samples/blob/main/servlet/spring-boot/java/hello-security-explicit/src/test/java/example/HelloSecurityExplicitApplicationTests.java
spring-security 文档 https://docs.spring.io/spring-security/reference/servlet/architecture.html
spring-security 官方教程 https://spring.io/guides/gs/securing-web/
