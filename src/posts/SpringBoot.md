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


#### 更改登录页面
更改`SecurityConfig`：
```diff
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.
                authorizeHttpRequests((request) -> request
                        .requestMatchers("/", "/index.html").permitAll()
                        .anyRequest().authenticated()
                )
-               .formLogin(Customizer.withDefaults())
+               .formLogin(form -> form
+                       .loginProcessingUrl("/login")
+                       .loginPage("/login.html")
+                       .permitAll()
+               )
                .logout(Customizer.withDefaults())
                .csrf().disable();
        return http.build();
    }
```
这时候登录页面就设置成了`login.html`，而登录接口还是`logion`

#### 参考资料
spring-security 官方示例代码 https://github.com/spring-projects/spring-security-samples/blob/main/servlet/spring-boot/java/hello-security-explicit/src/test/java/example/HelloSecurityExplicitApplicationTests.java
spring-security 文档 https://docs.spring.io/spring-security/reference/servlet/architecture.html
spring-security 官方教程 https://spring.io/guides/gs/securing-web/


## Spring Data JPA
Spring JPA(Java Persistence API), 是一个官方的java持久化接口规范，最新的jsr为[338](https://jcp.org/en/jsr/detail?id=338)。那么，它和MyBatis有什么区别呢？这是个比较有争议的话题，不过有一点可以肯定的是，JPA不适用XML，不用应对复杂的XML语法。

个人觉得JPA的接口更加简介，而且不用折腾什么myBatis generator什么的。

#### 定义JPA的Entity
我们继续以Spring-security里的登录功能为基础加入JPA
首先添加jpa的依赖
```xml
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-jpa</artifactId>
		</dependency>
```

使用JPA的第一步是定义`Entity`，我们对登录账户进行抽象，写出下面的entity：
```java
@Entity
@Data
public class Account{
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected Long id;

    private String username;

    private String password;

    private String name;

    private String telephone;

    private String email;

    public Account(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public Account(String username, String password, String name, String telephone, String email) {
        this.username = username;
        this.password = password;
        this.name = name;
        this.telephone = telephone;
        this.email = email;
    }
}
```
这个entity定义了一个账户所需要的一些基本信息，然后用lombok的`@Data`注解添加getter setter方法。Entity标注的类需要有一个`@Id`属性，在这里就是`id`属性了，我们还添加了`@GeneratedValue`注解，这样可以让id自动被赋值。

#### 编写Repository接口
我们可以直接继承Spring JPA提供的`CrudRepository`接口来使用jpa为我们提供的大量功能，在这个文件里，我们只需要按照[query-keywords](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#repository-query-keywords)来编写方法名即可，并不需要提供实现。
例如，我们对Account提供按id和按username查找的两种查询方法，定义如下：
```java
public interface AccountRepository extends CrudRepository<Account, Integer> {
    Optional<Account> findByUsername(String username);
    Optional<Account> findById(Integer id);
}
```

#### 连接数据库
JPA同样使用通常的jdbc于数据库服务器连接，不过在这里我们使用内嵌的数据库，这样更方便。
首先添加h2数据库依赖，h2数据库是一个轻量的java语言编写的sql数据库
```xml
		<dependency>
			<groupId>com.h2database</groupId>
			<artifactId>h2</artifactId>
			<scope>runtime</scope>
		</dependency>
```
然后一切就准备就绪啦，spring-boot会为我们处理好连接于通信的事情。
我们在启动类里添加一个`CommandLineRunner`的Bean来做测试
```java
	@Bean
	public CommandLineRunner demo(AccountRepository repository) {
		return (args) -> {
			// save a few customers
			repository.save(new Account("user", "$2a$10$zVTkhDKZNuEvO/Gtgp7QhOHGos5AFTSEeA308jOj/HUxzH4k0VOc2", "ankh", "17199999999", "ankh04@icloud.com"));
			// fetch all customers
			log.info("Customers found with findAll():");
			log.info("-------------------------------");
			for (Account account : repository.findAll()) {
				log.info(account.toString());
			}
			log.info("");
		};
```
这里`demo`的参数`repository`是Spring给我们自动注入的，这个AccountRepository就是上一小节定义的，这里我们直接拿来用就好。
CommandLineRunner类型的代码会在SpringBoot启动之后立马运行。在这里我们创建了一个Account，然后调用`repository.save()`方法将这个account存入数据库。然后我们接着用了Repository的一个方法`findAll()`来查找数据库中的所有数据，我们用一个for循环将所有数据打印出来，这时候启动springboot：`mvn spring-boot:run`，结果如下：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230114204957.png)


#### 编写测试类
每次都要启动springboot查看结果太麻烦，不如写个测试类。
添加测试依赖：
```xml
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-test</artifactId>
			<scope>test</scope>
		</dependency>
```
接下来我们需要改写下`JAXRSResourceBase`类：
```diff
+@Sql(scripts = {"classpath:schema.sql", "classpath:data.sql"})
+@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = Application.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class JAXRSResourceBase {
```
这样在我们启动测试的时候就会自动加载这两个sql文件：
```sql
-- schema.sql
DROP TABLE IF EXISTS account;

CREATE TABLE account(
    id          IDENTITY PRIMARY KEY,
    username    VARCHAR(50),
    password    VARCHAR(100),
    name        VARCHAR(50),
    telephone   VARCHAR(20),
    email       VARCHAR(100)
);

CREATE UNIQUE INDEX account_user ON account (username);
CREATE UNIQUE INDEX account_telephone ON account (telephone);
CREATE UNIQUE INDEX account_email ON account (email);
```
```sql
-- data.sql
INSERT INTO account(username, password) VALUES (
        'user',
        '$2a$10$Hp2hduKOnJUgqBRet8foNOqWRT76GumQsIeNU/2cZ0jABXL4t.vPy'
);
```
然后我们在测试类中验证登录功能，这需要和Spring-Security结合，我们留到下一节讲解。

#### Spring-JPA和Spring-Security结合
先把原来的UserDetailService的Bean工厂删掉
```diff
-    @Bean
-    public UserDetailsService userDetailsService() {
-        UserDetails user =
-                User.withDefaultPasswordEncoder()
-                        .username("user")
-                       .password("$2a$10$XiN.XAfCkJ6sH.4DF8Q80.NKq.iCh2y.QdYCFMEGTVSI0oR7WESua")
-                        .roles(Role.USER)
-                        .build();
-
-        return new InMemoryUserDetailsManager(user);
-    }
```
我们自己去实现UserDetailService
```java
@Named
public class AuthenticAccountDetailsService implements UserDetailsService {
    @Inject
    AuthenticAccountRepository authenticAccountRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 调用repository的实现，返回UserDetails实例
        var res = authenticAccountRepository.findByUsername(username);
        return res;
    }
}
```
UserDetailsService接口要求我们必须实现`loadUserByUsername`方法，这个方法的入参是用户名，输出是一个UserDetail，这是另一个接口。这个方法的大致意思是：框架传给我们一个username，希望获得这个用户的所有信息（主要是密码，用来比对）。
这里我们注入了`AuthenticAccountRepository`的Bean，它包装了`AccountRepository`，返回一个UserDetail。
先看下UserDetail的实现：
```java
@Slf4j
public class AuthenticAccount extends Account implements UserDetails {

    //  放置实例权限的哈希set
    private Collection<GrantedAuthority> authorities = new HashSet<>();

    public AuthenticAccount() {
        super();
        authorities.add(new SimpleGrantedAuthority(Role.USER));
    }

    @Override
    public String getPassword() {
        String pass = super.getPassword();
        return pass;
    }

    public AuthenticAccount(Account account) {
        // 调用无参构造器
        this();
        BeanUtils.copyProperties(account, this);
        // FIXME: id 不知道为什么没有复制过去，id的值为null
        this.id = account.getId();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    /**
     * 账户是否过期，默认不过期
     * @return
     */
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /**
     * 账户是否被锁定, 默认锁定
     * @return true
     */
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    /**
     * 密码是否过期，默认不过期
     * @return true
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }


    /**
     * 是否可用，默认可用
     * @return true
     */
    @Override
    public boolean isEnabled() {
        return true;
    }


    @Override
    public String toString() {
        return "AuthenticAccount{" +
                "id =" + getId() +
                ", username=" + getUsername() +
                ", password=" + getPassword() +
                ", name=" + getName() +
                ", email=" + getEmail() +
                ", telephone=" + getTelephone() +
                ", authorities=" + authorities +
                '}';
    }
}
```
代码比较长，但逻辑不复杂，就是继承Account类并实现UserDetails，UserDetails提供了对账户的细节控制：密码是否过期、账号是否过期、账号是否被锁定、账号是否可用，然后还有一个权限数组。
这里我们的实现比较简单，我们把账号设置为不过期、可用。然后为每个账号添加USER权限。当使用AuthenticAccount(Account account)构造函数的时候，把传进来的account的所有属性复制一下（因为AuthenticAccount是Account的子类，所以可以直接复制）。


#### 添加密码编码器
存储密码明文是很危险的，万一被不怀好意的人闯进了数据库，密码如果是明文，损失就太大了。所以SpringSecurity建议我们在数据库中存入编码过的密码。
关于密码编码的知识，可以参考SpringSecurity文档的说明：

>Throughout the years, the standard mechanism for storing passwords has evolved. In the beginning, passwords were stored in plaintext. The passwords were assumed to be safe because the data store the passwords were saved in required credentials to access it. However, malicious users were able to find ways to get large “data dumps” of usernames and passwords by using attacks such as SQL Injection. As more and more user credentials became public, security experts realized that we needed to do more to protect users' passwords.
>Developers were then encouraged to store passwords after running them through a one way hash, such as SHA-256. When a user tried to authenticate, the hashed password would be compared to the hash of the password that they typed. This meant that the system only needed to store the one-way hash of the password. If a breach occurred, only the one-way hashes of the passwords were exposed. Since the hashes were one-way and it was computationally difficult to guess the passwords given the hash, it would not be worth the effort to figure out each password in the system. To defeat this new system, malicious users decided to create lookup tables known as Rainbow Tables. Rather than doing the work of guessing each password every time, they computed the password once and stored it in a lookup table.
>To mitigate the effectiveness of Rainbow Tables, developers were encouraged to use salted passwords. Instead of using just the password as input to the hash function, random bytes (known as salt) would be generated for every user’s password. The salt and the user’s password would be run through the hash function to produce a unique hash. The salt would be stored alongside the user’s password in clear text. Then when a user tried to authenticate, the hashed password would be compared to the hash of the stored salt and the password that they typed. The unique salt meant that Rainbow Tables were no longer effective because the hash was different for every salt and password combination.
>In modern times, we realize that cryptographic hashes (like SHA-256) are no longer secure. The reason is that with modern hardware we can perform billions of hash calculations a second. This means that we can crack each password individually with ease.
>Developers are now encouraged to leverage adaptive one-way functions to store a password. Validation of passwords with adaptive one-way functions are intentionally resource-intensive (they intentionally use a lot of CPU, memory, or other resources). An adaptive one-way function allows configuring a “work factor” that can grow as hardware gets better. We recommend that the “work factor” be tuned to take about one second to verify a password on your system. This trade off is to make it difficult for attackers to crack the password, but not so costly that it puts excessive burden on your own system or irritates users. Spring Security has attempted to provide a good starting point for the “work factor”, but we encourage users to customize the “work factor” for their own system, since the performance varies drastically from system to system. Examples of adaptive one-way functions that should be used include bcrypt, PBKDF2, scrypt, and argon2.
>Because adaptive one-way functions are intentionally resource intensive, validating a username and password for every request can significantly degrade the performance of an application. There is nothing Spring Security (or any other library) can do to speed up the validation of the password, since security is gained by making the validation resource intensive. Users are encouraged to exchange the long term credentials (that is, username and password) for a short term credential (such as a session, and OAuth Token, and so on). The short term credential can be validated quickly without any loss in security.

大致意思是说，人们意识到存储明文密码不安全后，考虑使用哈希算法（比如SHA-256）打乱密码明文，然后再存储。但这种方法会收到Rainbow Tables的攻击(彩虹表会穷举一定范围的明文，得到一大堆散列后的密文列表，在得到密文后通过在个密文列表中索引，反向得出明文)。于是应当在哈希的时候加上盐值。
但由于现在的计算机算力已经很高了，SHA-256已经不再安全，我们应该考虑使用更加安全的自适应的单向函数（ leverage adaptive one-way functions）来存储密码。
Spring-Security做的就是把上面的技术打包送给我们（即加盐的自适应单向函数），我们拆箱即用。
但是更复杂的单向函数意味着更长的计算时间，意味着用户更长的等待时间，这时候我们可以利用Spring提供的OAuth Token类似的技术来优化。

我们就使用Spring默认用的`bcrypt`算法就好，直接把Bean暴露出来就可以了，我们把代码加到SecurityConfig中，方便管理：
```java
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
```

这时候需要注意，我们存在数据库中的密码必须是bcrypt加密的格式，bcrypt加密格式大概长这样：`{bcrypt}$2a$10$almMMDSr3wRVrlSy6Atuje1zkfa27GT0Iisj2R763QNqRJlv.cDa6`
我们可以使用spring cli（用sdkman安装）来方便的生成密文，比如我们想生成明文`user`的密文，可以用下面的命令：
```shell
➜ spring encodepassword user
{bcrypt}$2a$10$almMMDSr3wRVrlSy6Atuje1zkfa27GT0Iisj2R763QNqRJlv.cDa6
```
使用`spring help encodepassword`可以查看这个指令的帮助：
```shell
spring encodepassword - Encode a password for use with Spring Security
 
usage: spring encodepassword [options] <password to encode>
 
Option                    Description
------                    -----------
-a, --algorithm <String>  The algorithm to use (default: default)
 
examples:
 
    To encode a password with the default encoder:
        $ spring encodepassword mypassword
 
    To encode a password with pbkdf2:
        $ spring encodepassword -a pbkdf2 mypassword
```
我们取{bcrypt}后面的部分，放到`data.sql`的密码里就好了。

然后运行 `mvn test`，就可以看到测试成功啦！


#### 参考资料
- Spring Security对密码存储的介绍： https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html#authentication-password-storage
- 安装Spring Cli： https://docs.spring.io/spring-boot/docs/current/reference/html/getting-started.html#getting-started.installing.cli
- jpa query keywords: https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#repository-query-keywords


## 使用腾讯与的短信功能实现验证码注册
首先我们需要实现注册功能，然后在注册功能的基础上添加验证码功能
### 实现注册功能
#### 前端
前端只需要添加一个注册页面就好了
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230115192241.png)
给“确认”和“返回”按钮添加点击事件：
```javascript
    document.querySelector("#verifycode-btn").addEventListener("click", (e) => {
        // TODO: 字段校验功能
        let btn = e.target;
        // 将button禁用
        btn.disabled = true;
        // 等待时间，单位为秒
        let waitTime = 60;
        // setInterval方法给的id, 用来取消interval
        let intervId;
        if (!intervId) {
            let curCount = 1;
            btn.value = `${waitTime}秒后再试`;
            // 启动一个间隔为1秒的定时器
            intervId = setInterval(() => {
                btn.value = `${waitTime - curCount}秒后再试`;
                curCount += 1;
            }, 1000);
        }
        setTimeout(() => {
            btn.disabled = false;
            clearInterval(intervId);
            btn.value = "获取验证码"
        }, 1000 * waitTime);
    });

    document.querySelector("#return-btn").addEventListener("click", (e) => {
        window.location.href = "login.html";
    });
```

#### 添加用户管理的后端代码
我们此时需要添加一个新的endpoint，就叫`AccountEndpoinot`好了，我们希望使用json的方式进行前后端沟通，于是编写如下代码：
```java
@Service
@Path("/account")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Slf4j
public class AccountEndpoint {

    @Inject
    AccountService accountService;

    @POST
    @Path("/create")
    // 如果这里的Valid验证失败，会抛出ValidationException
    public Response create(@Valid Account account) {
        return CommonResponse.op(() -> accountService.createAccount(account));
    }

}
```
上面的代码有以下几点需要注意
- 这里使用了`@Produces`和`@Consumes`注解，并传入了`MediaType.APPLICATION_JSON`表示接受和返回json格式的数据。
- 父级Path是`/account`，子级Path是`/create`，再加上JerseyConfig文件中设置的`/api`，我们如果要访问这个接口，就需要使用`/api/account/create`。
- `AccountService`是对Account进行各种操作的服务类，注入到这里的endpoint来进行使用。
- create方法直接返回一个对象即可，jersey会自动帮我们转换成json格式
- 我们使用了一个帮助类`CommonResponse`帮助我们对返回信息进行格式化，并且可以自动处理异常

AccountService的代码如下：
```java
@Named
@Slf4j
public class AccountService {
    @Inject
    private AccountRepository accountRepository;

    // 在 SecurityConfig 文件中有PasswordEncoder的Bean，所以这里能够注入成功
    @Inject
    private PasswordEncoder passwordEncoder;

    /**
     * 创建一个用户，注意：密码需要加密存储
     */
    public void createAccount(Account account) {
        // 加密密码
        var pass = passwordEncoder.encode(account.getPassword());
        account.setPassword(pass);
        // 调用jpa存储到数据库
        accountRepository.save(account);
    }
}
```
要点写在注释里了，在存储前，我们需要用Bcrypt算法对密码明文进行加密。我们使用jpa的`save`方法，对account进行存储。

帮助类CommonResponse代码如下：
```java
@Slf4j
public abstract class CommonResponse {
    // 获取相应的状态和message，构建Response
    public static Response send(Response.Status status, String message) {
        Integer code = status.getStatusCode();
        return Response.status(status)
                .type(MediaType.APPLICATION_JSON)
                .entity(new host.ankh.jeyseylearn.infrastructure.jaxrs.CodedMessage(code, message))
                .build();
    }

    // 对send的封装
    public static Response failure(String message) {
        return send(Response.Status.INTERNAL_SERVER_ERROR, message);
    }
    // 对send的封装
    public static Response success(String message) {
        return send(Response.Status.OK, message);
    }
    // 对send的封装
    public static Response success() {
        return send(Response.Status.OK, "success");
    }

    // 封装执行代码的操作，返回Response，自动处理错误
    public static Response op(Runnable runner, Consumer<Exception> exceptionConsumer) {
        try {
            runner.run();
            return success();
        } catch (Exception e) {
            exceptionConsumer.accept(e);
            return failure(e.getMessage());
        }
    }

    // 对op的封装
    public static Response op(Runnable runner) {
        // log.error用法：接受两个参数，错误信息String：e.getMessage(), 错误对象Throwable: e
        return op(runner, e -> log.error(e.getMessage(), e));
    }
}
```
CommonResponse的核心是send方法，我们构造一个包含`code, message, data`属性的实例，然后转化成JSON type的Response返回。
剩下的函数都是对send方法的包装罢了，op方法可以接受一个“可执行的代码块”，并接受一个消费Exception的消费者，如果发生错误，会调用这个消费者，然后返回failue。

后端的基本代码就是如此，别忘了我们还需要改下配置类：`JerseyConfig`和`SecurityConfig`，好让我们的新代码生效。

#### 修改JerseyConfig
每次我们添加一个新的endpoint都需要在JerseyConfig里边注册，这样子太麻烦了，我们写一个帮助方法，借助Spring提供的功能自动扫描固定目录下的endpoint
```diff
    public JerseyConfig() {
-       register(HelloEndpoint.class);
-       register(ReverseReturnEndpoint.class);
+       scanPackages("host.ankh.jeyseylearn.endpoint");
+       scanPackages("host.ankh.jeyseylearn.infrastructure.jaxrs");
    }

+    /**
+     * 自动注册目录下的Path，Provider到Jersey
+     * @param scanPackage
+     */
+    private void scanPackages(String scanPackage) {
+        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
+        scanner.addIncludeFilter(new AnnotationTypeFilter(Path.class));
+        scanner.addIncludeFilter(new AnnotationTypeFilter(Provider.class));
+        this.registerClasses(scanner.findCandidateComponents(scanPackage).stream()
+                .map(beanDefinition -> ClassUtils.resolveClassName(Objects.requireNonNull(beanDefinition.getBeanClassName()), this.getClassLoader()))
+                .collect(Collectors.toSet()));
+    }
```
我们只扫描被`@Path`和`@Provider`注释过的类。这里的Provider我们在[[#处理边界条件]]中会用到

#### 测试
```java
	@Test
	void createAccountAndLoginWithThisAccount() throws Exception {
		var account = new Account("ankh", "ankh", "ankh", "17911112222", "ankh04@icloud.com");
		post_json("/account/create", account);
		Form form = new Form();
		form.param("username", "ankh");
		form.param("password", "ankh");
		Invocation.Builder builder = ClientBuilder.newClient()
				.target("http://localhost:" + port + "/login")
				.property(ClientProperties.FOLLOW_REDIRECTS, false)
				.request(MediaType.MULTIPART_FORM_DATA).accept(MediaType.TEXT_PLAIN);
		var res = builder.post(Entity.form(form));
		// 应该会重定位到主页
		assertRedirect(res);
		// 设置cookies
		setCookies(res.getCookies());
		// 访问需要权限的接口
		var res2 = get("/reverse?data=hello");
		assertOK(res2);
		assert res2.readEntity(String.class).equals("olleh");
	}
```
我稍微修改了下`JAXRSResourceBase`，让它支持了json格式的输入输出。然后调用注册接口，然后用新注册的账号登录，最后访问需要登录权限的`/reverse`接口。
这一个测试用力包含了好多接口，这样的用例并不是很好...不过还是测试通过了。

然后我们用httpie在命令行做一下测试，测试脚本如下：
```shell
#!/usr/bin/bash
http POST http://localhost:8088/api/account/create username=ankh password=ankh name=ankh telephone=17399998888 email=ankh04@icloud.com 
```
直接在命令行执行这个文件就可以测试啦，效果如下：
```shell
➜  account git:(main) ✗ ./create_account.http
HTTP/1.1 200
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Connection: keep-alive
Content-Length: 44
Content-Type: application/json
Date: Sun, 15 Jan 2023 07:35:28 GMT
Expires: 0
Keep-Alive: timeout=60
Pragma: no-cache
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
 
{
    "code": 200,
    "data": null,
    "message": "success"
}
```
这样接口测试就更全面了。


#### 处理边界条件
直接使用错误的用户进行登录会导致错误，然后被重定向到login，所以会收到302
```shell
➜  account git:(main) ✗ ./create_wrong_account.http
HTTP/1.1 302
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Connection: keep-alive
Content-Length: 0
Date: Sun, 15 Jan 2023 08:14:44 GMT
Expires: 0
Keep-Alive: timeout=60
Location: http://localhost:8088/login.html
Pragma: no-cache
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
```
发生上面错误的原因是，我们已经在Account的entity上写了validation的注解，RAXRS会为我们校验，在RAXRS的runtime在校验失败的时候，会抛出`ConstraintViolationException`，runtime会自己处理这个错误。为了避免302，我们可以编写自己的exception处理函数。

#### 实现JAXRS ExceptionMapper
JAXRS很好的一个地方是，我们可以任意扩展它的运行时行为。具体来说，只需要实现一些接口，然后把它用@Provider注解暴露给JAXRS。 


然后再次尝试，查看结果：
```shell
➜  account git:(main) ✗ ./create_wrong_account.http
HTTP/1.1 400
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Connection: close
Content-Length: 61
Content-Type: application/json
Date: Sun, 15 Jan 2023 08:39:20 GMT
Expires: 0
Pragma: no-cache
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
 
{
    "code": 400,
    "data": null,
    "message": "用户名不允许为空"
}
```
成功检测到了用户名为空，是符合预期的。



### 给注册接口添加验证码
这一块其实比较复杂，因为要使用第三方的服务，密码不能直接写在源代码里，应该使用配置中心管理。
另一方面，需要设置验证码的有效时间，因此需要用到redis的部分功能。
#### 腾讯云短信服务
我使用腾讯云的短信功能来做验证码，先去腾讯云填一些资料，申请通过后就可以用腾讯云提供的SDK使用短信功能啦。 
我在`infrastructure`下新建了一个`third_party_service`的目录，在这个目录里添加SendSms工具类，如下：
```java
public class SendSms {
    // 因为我的模板只用两个参数：
    //     {1}为您的短信验证码，请于{2}分钟内登录。
    // 所以这里有两个入参，一个是短信验证码，一个是验证码ttl
    // 剩下的一个入参就是电话号码
    public static SendSmsResponse send(String code, String time, String telephone) {
        // TODO: 使用配置中心传入secretKey
        // 这里使用环境变量读取的方式，需要现在环境变量中先设置这两个值
        Credential cred = new Credential(System.getenv("SecretId"), System.getenv("SecretKey"));

        // 只支持三个区域： 北京 广州 南京
        SmsClient client = new SmsClient(cred, "ap-guangzhou");
        // 实例化一个请求对象
        SendSmsRequest req = new SendSmsRequest();

        // 短信应用ID
        String sdkAppId = "1400790975";
        req.setSmsSdkAppId(sdkAppId);

        // 短信签名内容
        String signName ="我的计算机学习记录个人网";
        req.setSignName(signName);

        // 模板ID
        String templateId = "1669702";
        req.setTemplateId(templateId);

        // 模板参数
        String[] templateParamSet = {code, time};
        req.setTemplateParamSet(templateParamSet);

        // 下发手机号
        String[] phoneNumberSet = {telephone};
        req.setPhoneNumberSet(phoneNumberSet);

        try {
            SendSmsResponse res = client.SendSms(req);
            return res;
        } catch (TencentCloudSDKException e) {
            throw new RuntimeException(e);
        }
    }
}
```
在使用这个类的时候，需要先在环境变量中传入secret值:
```shell
export SecretId=xxxxxxx
export SecretKey=xxxxxxxx
```
把这个类的调用放到CommandLineRunner中，启动springboot就发现短信已经发到手机了。


#### 使用nacos配置中心管理密码
按照[nacos官方文档](https://nacos.io/zh-cn/docs/v2/quickstart/quick-start.html)安装nacos并启动。
启动之后nacos会在本地启动一个服务，我们可以通过web的方式进入管理界面：http://127.0.0.1:8848/nacos

进入后可以在管理界面以图形化的方式设置我们的秘钥：
![](https://picture-bed-1301848969.cos.ap-shanghai.myqcloud.com/20230116104102.png)

然后在命令行使用下面的命令测试：
```shell
curl -X GET "http://localhost:8848/nacos/v1/cs/configs?dataId=TencentSMS&group=DEFAULT_GROUP"
```
返回的就是我们的json格式的秘钥啦。

在java后端中，我们需要添加一个entity：
```java
@Entity
public class Secret {
    @Id
    public String SecretId;
    public String SecretKey;
}
```
然后修改`SendSms.java`
```diff
    public static SendSmsResponse send(String code, String time, String telephone) {
+        var res = ClientBuilder.newClient()
+                .target("http://localhost:8848/nacos/v1/cs/configs?dataId=TencentSMS&group=DEFAULT_GROUP")
+                .request(MediaType.TEXT_PLAIN)
+                .accept(MediaType.APPLICATION_JSON)
+                .get();
+        var secret = res.readEntity(Secret.class);

-        Credential cred = new Credential(System.getenv("SecretId"), System.getenv("SecretKey"));
+        Credential cred = new Credential(secret.SecretId, secret.SecretKey);
```
这样就完成了一个简单的RPC：由我们的后端向nacos发起请求获取配置信息。
 
#### 使用Redis存储验证码
添加spring data redis依赖：
```xml
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-redis</artifactId>
		</dependency>
```
增加redis的帮助类
```java
@Named
public class RedisServiceImpl implements RedisService {
    @Inject
    private StringRedisTemplate redisTemplate;

    @Override
    public void set(String key, String value) {
        redisTemplate.opsForValue().set(key, value);
    }

    @Override
    public String get(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    @Override
    public boolean expire(String key, long expire) {
        // 以秒为单位设置key的过期时间
        return redisTemplate.expire(key, expire, TimeUnit.SECONDS);
    }

    @Override
    public void remove(String key) {
        redisTemplate.delete(key);
    }

    @Override
    public Long increment(String key, long delta) {
        return redisTemplate.opsForValue().increment(key, delta);
    }
}
```

在AccountService中加入验证码相关的功能
```java
    @Override
    public void generateVerifyCode(String telephone) {
        // 生成验证码
        var verifyCode = makeVerifyCode(telephone);
        // 发送验证码
        var expire_minute = Math.ceilMod(VERIFY_CODE_EXPIRE_SECONDS, 60);
        SendSms.send(verifyCode, String.valueOf(expire_minute), telephone);
    }

    /**
     * 随机生成六位数字验证码，并保存到redis
     * @param telephone
     * @return
     */
    public String makeVerifyCode(String telephone) {
        // TODO: 如果redis中已经有该手机了，且过去没有多久，拒绝生成验证码
        var sb = new StringBuilder();
        var rand = new Random();
        // 随机生成六位数字校验码
        for (int i = 0; i < 6; i++) {
            sb.append(rand.nextInt(10));
        }
        var verifyCode = sb.toString();
        // 保存进redis
        redisService.set(telephone, verifyCode);
        // 设置过期时间
        redisService.expire(telephone, VERIFY_CODE_EXPIRE_SECONDS);
        return verifyCode;
    }

    @Override
    public boolean checkVerifyCode(String telephone, String verifyCode) {
        var target = redisService.get(telephone);
        return verifyCode.equals(target);
    }
```
这里的generateVerifyCode被拆分成了两步：1. 生成数字验证码保存到redis 2. 调用腾讯接口发送短信
这样拆分的目的可以让逻辑更清晰，更重要的是方便测试。下面来看看测试类:
```java
	@Test
	void createAccountWithoutAuth() throws Exception {
		var verifyCode = accountService.makeVerifyCode("17911112222");
		var account = new AccountWithVerifyCode("ankh", "ankh", "ankh", "17911112222", "ankh04@icloud.com", verifyCode);
		var res = post_json("/account/create", account);
		assertOK(res);
	}
```
由于我们现在注册需要加上验证码，我们调用`makeVerifyCode`直接从后台拿到验证码信息，然后调用`/account/create`接口创建账户


#### 前端代码
由于我们的后端接口是接受json的request，而前端表单提交默认是form payload，所以我们使用axios自己发出请求：
```diff
    <div class="btn-group-box">
        <input id="return-btn" type="button" value="返回">
-       <input type="submit" value="确认">
+       <!--不能使用type：button，以为那样是form注册, 在这里我们使用axios发送json负载的请求-->
+       <input id="submit-btn" type="button" value="确认">
    </div>
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
+        document.querySelector("#submit-btn").addEventListener("click", (e) => {
+        let telephone = document.querySelector('#telephone-input').value;
+        let password = document.querySelector('#password-input').value;
+        let username = document.querySelector('#username-input').value;
+        let verifycode = document.querySelector('#verifycode-input').value;
+        if (!telephone | !password | !username | !verifycode) {
+            // 填写信息不全，返回
+            return;
+        }
+        axios.post('/api/account/create', {
+            username,
+            password,
+            telephone,
+            verifyCode: verifycode
+        });
+    });

```

#### 下一步
- Spring Security JWT
- Swagger

#### 参考资料
java EE7 文档  https://docs.oracle.com/javaee/7/tutorial/partwebsvcs.htm#BNAYK
JAX RS 教程 https://www.logicbig.com/tutorials/java-ee-tutorial/jax-rs/getting-started-with-jax-rs.html